import voicemeeterlib as voicemeeter
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel
import traceback

# Request models
class GainRequest(BaseModel):
    gain: float

class MuteRequest(BaseModel):
    mute: bool

class A1Request(BaseModel):
    enabled: bool

class A2Request(BaseModel):
    enabled: bool

# --- Configuration ---
VMR_KIND = "banana"  # or "potato" or "basic"

# --- Voicemeeter Connection ---
vmr = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vmr
    try:
        # Use voicemeeter.api() to get the concrete Voicemeeter object
        vmr = voicemeeter.api(VMR_KIND)
        
        # Defensive check: Ensure vmr is not None before attempting to login
        if vmr is None:
            raise RuntimeError(
                f"voicemeeter.api('{VMR_KIND}') returned None. "
                "This typically means Voicemeeter is not running, "
                "or there's a problem with the voicemeeterlib installation "
                "or its ability to locate the Voicemeeter application."
            )

        # FIXED: login() is a synchronous method, not async
        vmr.login()
        print(f"Successfully connected to Voicemeeter {VMR_KIND}.")
    except Exception as e:
        print(f"Could not connect to Voicemeeter {VMR_KIND}. Make sure it's running.")
        print("-------------------")
        print("DETAILED ERROR:")
        traceback.print_exc()
        print("-------------------")
        vmr = None # Ensure vmr is set to None if connection fails
    yield
    if vmr:
        # FIXED: logout() is also synchronous, not async
        vmr.logout()
        print("Disconnected from Voicemeeter.")

# --- FastAPI App ---
app = FastAPI(lifespan=lifespan)

# --- API Endpoints ---
@app.get("/")
async def read_root():
    # Make sure index.html exists in the same directory as your Python script
    try:
        with open("index.html") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Voicemeeter API Server</h1><p>index.html not found</p>", status_code=200)

@app.get("/api/strips")
async def get_strips():
    if not vmr:
        raise HTTPException(status_code=503, detail="Voicemeeter not connected")
    
    try:
        strips = []
        
        # Debug: Check if vmr has the expected attributes
        print(f"VMR type: {type(vmr)}")
        print(f"VMR attributes: {dir(vmr)}")
        
        # Inputs (strips)
        for i in range(len(vmr.strip)):
            try:
                strip = vmr.strip[i]
                # Get A1 and A2 states for strips
                a1_enabled = getattr(strip, 'A1', False)
                a2_enabled = getattr(strip, 'A2', False)
                strips.append({
                    "id": f"input-{i}",
                    "label": getattr(strip, 'label', '') or f"Strip {i+1}",
                    "gain": getattr(strip, 'gain', 0.0),
                    "mute": getattr(strip, 'mute', False),
                    "a1": a1_enabled,
                    "a2": a2_enabled
                })
            except Exception as e:
                print(f"Error accessing strip {i}: {e}")
        
        # Outputs (buses)
        for i in range(len(vmr.bus)):
            try:
                bus = vmr.bus[i]
                strips.append({
                    "id": f"output-{i}",
                    "label": getattr(bus, 'label', '') or f"Bus {i+1}",
                    "gain": getattr(bus, 'gain', 0.0),
                    "mute": getattr(bus, 'mute', False),
                    "a1": False,  # Buses don't have A1/A2
                    "a2": False
                })
            except Exception as e:
                print(f"Error accessing bus {i}: {e}")
        
        return strips
        
    except Exception as e:
        print(f"Error in get_strips: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/strips/{strip_id}/gain")
async def set_gain(strip_id: str, request: GainRequest):
    if not vmr:
        raise HTTPException(status_code=503, detail="Voicemeeter not connected")
    try:
        strip_type, s_id = strip_id.split('-')
        index = int(s_id)
        
        if strip_type == "input":
            vmr.strip[index].gain = request.gain
        elif strip_type == "output":
            vmr.bus[index].gain = request.gain
        else:
            raise ValueError("Invalid strip type")
        return {"status": "success", "gain": request.gain}
    except (IndexError, AttributeError, ValueError) as e:
        print(f"Error in set_gain: {e}")
        raise HTTPException(status_code=404, detail=f"Strip not found or invalid operation: {str(e)}")

@app.post("/api/strips/{strip_id}/mute")
async def set_mute(strip_id: str, request: MuteRequest):
    if not vmr:
        raise HTTPException(status_code=503, detail="Voicemeeter not connected")
    try:
        strip_type, s_id = strip_id.split('-')
        index = int(s_id)
        
        if strip_type == "input":
            vmr.strip[index].mute = request.mute
        elif strip_type == "output":
            vmr.bus[index].mute = request.mute
        else:
            raise ValueError("Invalid strip type")
        return {"status": "success", "mute": request.mute}
    except (IndexError, AttributeError, ValueError) as e:
        print(f"Error in set_mute: {e}")
        raise HTTPException(status_code=404, detail=f"Strip not found or invalid operation: {str(e)}")

@app.post("/api/strips/{strip_id}/a1")
async def set_a1(strip_id: str, request: A1Request):
    if not vmr:
        raise HTTPException(status_code=503, detail="Voicemeeter not connected")
    try:
        strip_type, s_id = strip_id.split('-')
        index = int(s_id)
        
        if strip_type == "input":
            vmr.strip[index].A1 = request.enabled
        else:
            raise ValueError("A1/A2 only available for input strips")
        return {"status": "success", "a1": request.enabled}
    except (IndexError, AttributeError, ValueError) as e:
        print(f"Error in set_a1: {e}")
        raise HTTPException(status_code=404, detail=f"Strip not found or invalid operation: {str(e)}")

@app.post("/api/strips/{strip_id}/a2")
async def set_a2(strip_id: str, request: A2Request):
    if not vmr:
        raise HTTPException(status_code=503, detail="Voicemeeter not connected")
    try:
        strip_type, s_id = strip_id.split('-')
        index = int(s_id)
        
        if strip_type == "input":
            vmr.strip[index].A2 = request.enabled
        else:
            raise ValueError("A1/A2 only available for input strips")
        return {"status": "success", "a2": request.enabled}
    except (IndexError, AttributeError, ValueError) as e:
        print(f"Error in set_a2: {e}")
        raise HTTPException(status_code=404, detail=f"Strip not found or invalid operation: {str(e)}")

# Add a debug endpoint to help troubleshoot
@app.get("/api/debug")
async def debug_vmr():
    if not vmr:
        return {"status": "not_connected", "message": "Voicemeeter not connected"}
    
    debug_info = {
        "status": "connected",
        "type": str(type(vmr)),
        "attributes": [attr for attr in dir(vmr) if not attr.startswith('_')],
        "version": getattr(vmr, 'version', 'unknown'),
        "strips_count": len(vmr.strip),
        "buses_count": len(vmr.bus)
    }
    
    return debug_info

# Ensure you have a 'static' directory with your static files (e.g., CSS, JS)
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except RuntimeError:
    # Static directory doesn't exist, that's okay
    print("Warning: 'static' directory not found. Static files will not be served.")

# --- Main ---
if __name__ == "__main__":
    print("Starting server...")
    print("Open http://localhost:8001 in your browser.")
    print("Or from another device: http://<your-ip-address>:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)