# Voicemeeter Web Remote

A web-based remote control interface for Voicemeeter, allowing you to control your audio mixing from any device on your network through a modern web browser.

## Features

- **Real-time Audio Control**: Adjust gain levels for all input strips and output buses
- **Mute Controls**: Mute/unmute individual channels with visual feedback
- **A1/A2 Output Routing**: Control which inputs are routed to A1 (Main Output) and A2 (Secondary Output)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Touch-Friendly Interface**: Optimized for touch devices with intuitive controls
- **Network Access**: Control Voicemeeter from any device on your local network

## Screenshots

_[Add screenshots here once you have them]_

## Requirements

- **Voicemeeter**: Voicemeeter Banana (recommended) or Voicemeeter Potato
- **Python 3.7+**: For running the web server
- **Network Access**: Devices need to be on the same local network

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/voicemeeter-webremote.git
cd voicemeeter-webremote
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start Voicemeeter

Make sure Voicemeeter is running on your system before starting the web server.

## Usage

### Starting the Server

```bash
python main.py
```

The server will start on `http://localhost:8001`

### Accessing the Interface

- **Local access**: Open `http://localhost:8001` in your browser
- **Network access**: Open `http://YOUR_COMPUTER_IP:8001` from any device on your network

### Controls

#### Volume Sliders

- **Vertical sliders**: Drag up/down to adjust gain levels
- **Double-tap/click**: Reset to 0.0 dB
- **Range**: -60 dB to +12 dB with non-linear mapping (0.0 dB at 70% position)

#### Mute Button

- **Green**: Channel is active
- **Red**: Channel is muted
- **Click**: Toggle mute state

#### A1/A2 Buttons

- **A1 (Blue)**: Routes audio to Main Output (A1)
- **A2 (Orange)**: Routes audio to Secondary Output (A2)
- **Light colors**: Output is disabled
- **Dark colors + ✓**: Output is enabled
- **Disabled**: Only available for input strips (not output buses)

## API Endpoints

### GET `/api/strips`

Returns the current state of all strips and buses:

```json
[
  {
    "id": "input-0",
    "label": "Strip 1",
    "gain": 0.0,
    "mute": false,
    "a1": true,
    "a2": false
  }
]
```

### POST `/api/strips/{strip_id}/gain`

Set gain level for a strip:

```json
{
  "gain": -5.5
}
```

### POST `/api/strips/{strip_id}/mute`

Mute/unmute a strip:

```json
{
  "mute": true
}
```

### POST `/api/strips/{strip_id}/a1`

Enable/disable A1 routing:

```json
{
  "enabled": true
}
```

### POST `/api/strips/{strip_id}/a2`

Enable/disable A2 routing:

```json
{
  "enabled": true
}
```

### GET `/api/debug`

Returns debug information about the Voicemeeter connection.

## Configuration

### Voicemeeter Type

Edit `main.py` to change the Voicemeeter type:

```python
VMR_KIND = "banana"  # Options: "banana", "potato", "basic"
```

### Port Configuration

Change the port in `main.py`:

```python
uvicorn.run(app, host="0.0.0.0", port=8001)
```

## Troubleshooting

### Connection Issues

1. **"Voicemeeter not connected"**: Make sure Voicemeeter is running
2. **"voicemeeter.api() returned None"**: Check Voicemeeter installation
3. **Network access not working**: Check firewall settings and network configuration

### Common Problems

- **Buttons not responding**: Refresh the page or check browser console
- **A1/A2 not working**: Ensure you're using Voicemeeter Banana or Potato
- **Mobile not working**: Check if your device is on the same network

### Debug Information

Visit `http://localhost:8001/api/debug` to see connection status and Voicemeeter information.

## Development

### Project Structure

```
voicemeeter-webremote/
├── main.py              # FastAPI server and Voicemeeter integration
├── index.html           # Main web interface
├── static/
│   ├── script.js        # Frontend JavaScript
│   └── style.css        # Styling and responsive design
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

### Adding Features

1. **New Controls**: Add API endpoints in `main.py`
2. **UI Changes**: Modify `static/script.js` and `static/style.css`
3. **Styling**: Update CSS classes and responsive breakpoints

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Voicemeeter](https://vb-audio.com/Voicemeeter/) - Professional audio mixing software
- [voicemeeterlib](https://github.com/onyx-and-iris/voicemeeterlib) - Python library for Voicemeeter control
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework for building APIs
- [Uvicorn](https://www.uvicorn.org/) - Lightning-fast ASGI server

## Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Visit the [debug endpoint](#api-endpoints) for connection information
3. Open an issue on GitHub with detailed information about your setup

---

**Note**: This application requires Voicemeeter to be running on the same system. It provides a web interface for remote control but does not replace Voicemeeter itself.
