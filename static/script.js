document.addEventListener("DOMContentLoaded", () => {
  const stripsContainer = document.getElementById("strips-container");

  // Nonlinear mapping functions to put 0.0 dB at 70%
  function gainToSliderPercent(gain) {
    if (gain <= 0) {
      // -60 to 0 dB maps to 0% to 70%
      return ((gain + 60) / 60) * 70;
    } else {
      // 0 to +12 dB maps to 70% to 100%
      return 70 + (gain / 12) * 30;
    }
  }

  function sliderPercentToGain(percent) {
    if (percent <= 70) {
      // 0% to 70% maps to -60 to 0 dB
      return (percent / 70) * 60 - 60;
    } else {
      // 70% to 100% maps to 0 to +12 dB
      return ((percent - 70) / 30) * 12;
    }
  }

  const fetchStrips = async () => {
    try {
      const response = await fetch("/api/strips");
      const strips = await response.json();
      renderStrips(strips);
    } catch (error) {
      console.error("Error fetching strips:", error);
      stripsContainer.innerHTML = "<p>Error connecting to Voicemeeter. Is the server running?</p>";
    }
  };

  const renderStrips = (strips) => {
    stripsContainer.innerHTML = "";
    strips.forEach((strip) => {
      const stripElement = document.createElement("div");
      stripElement.classList.add("strip");

      // Use the same nonlinear mapping for initial position
      const initialPercent = gainToSliderPercent(strip.gain);
      const initialFillHeight = initialPercent;

      stripElement.innerHTML = `
                    <label>${strip.label}</label>
                    <div class="controls">
                        <div class="slider-container">
                            <div class="vertical-slider-wrapper" data-strip-id="${strip.id}">
                                <div class="vertical-slider-track" style="--fill-height: ${initialFillHeight}%; --thumb-position: ${initialFillHeight}%">
                                    <div class="vertical-slider-thumb"></div>
                                </div>
                            </div>
                            <span class="gain-value">${strip.gain.toFixed(1)} dB</span>
                        </div>
                        <button data-strip-id="${strip.id}" class="mute-button ${strip.mute ? "muted" : ""}">${strip.mute ? "Unmute" : "Mute"}</button>
                        <div class="a1a2-buttons">
                            <button data-strip-id="${strip.id}" class="a1-button ${strip.a1 ? "enabled" : ""}" ${strip.id.startsWith("output-") ? "disabled" : ""}>A1</button>
                            <button data-strip-id="${strip.id}" class="a2-button ${strip.a2 ? "enabled" : ""}" ${strip.id.startsWith("output-") ? "disabled" : ""}>A2</button>
                        </div>
                    </div>
                `;

      stripsContainer.appendChild(stripElement);
    });

    // Initialize vertical sliders
    initializeVerticalSliders();
  };

  const initializeVerticalSliders = () => {
    const sliders = document.querySelectorAll(".vertical-slider-wrapper");

    sliders.forEach((slider) => {
      const track = slider.querySelector(".vertical-slider-track");
      const thumb = slider.querySelector(".vertical-slider-thumb");
      const stripId = slider.dataset.stripId;
      const gainValue = slider.parentElement.querySelector(".gain-value");

      // Each slider has its own tap tracking variables
      let isDragging = false;
      let lastTap = 0;
      let tapTimeout;
      let touchStartY = 0;
      let touchStartTime = 0;

      const updateSlider = (clientY) => {
        const rect = track.getBoundingClientRect();
        const trackHeight = rect.height;
        const relativeY = clientY - rect.top;
        // Convert mouse position to slider percentage (0% at bottom, 100% at top)
        let percent = 100 - Math.max(0, Math.min(100, (relativeY / trackHeight) * 100));
        percent = Math.max(0, Math.min(100, percent));

        // Convert percentage to gain using the same nonlinear mapping
        const gain = sliderPercentToGain(percent);
        const clampedGain = Math.max(-60, Math.min(12, gain));

        // Update thumb position using CSS custom property
        track.style.setProperty("--thumb-position", `${percent}%`);

        // Update track fill
        track.style.setProperty("--fill-height", `${percent}%`);

        // Update display
        if (gainValue) {
          gainValue.textContent = `${clampedGain.toFixed(1)} dB`;
        }

        // Send to server
        updateGain(stripId, clampedGain);
      };

      const handleDoubleTap = async () => {
        // Reset to 0.0 (70% position)
        track.style.setProperty("--thumb-position", "70%");
        track.style.setProperty("--fill-height", "70%");

        if (gainValue) {
          gainValue.textContent = "0.0 dB";
        }

        // Add visual feedback
        slider.style.transform = "scale(1.05)";
        slider.style.transition = "transform 0.1s ease";
        setTimeout(() => {
          slider.style.transform = "";
          slider.style.transition = "";
        }, 100);

        // Send the reset command to the server
        await updateGain(stripId, 0.0);
      };

      // Mouse events for desktop
      track.addEventListener("mousedown", (e) => {
        isDragging = true;
        updateSlider(e.clientY);
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          updateSlider(e.clientY);
        }
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
      });

      // Touch events for mobile
      track.addEventListener("touchstart", (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = new Date().getTime();
        isDragging = true;
        updateSlider(e.touches[0].clientY);
        e.preventDefault();
      });

      document.addEventListener("touchmove", (e) => {
        if (isDragging) {
          updateSlider(e.touches[0].clientY);
          e.preventDefault();
        }
      });

      document.addEventListener("touchend", (e) => {
        isDragging = false;

        const touchEndTime = new Date().getTime();
        const touchDuration = touchEndTime - touchStartTime;
        const touchDistance = Math.abs(e.changedTouches[0].clientY - touchStartY);

        // Check if this was a tap (short duration, small movement)
        if (touchDuration < 300 && touchDistance < 10) {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;

          if (tapLength < 600 && tapLength > 0) {
            // Double tap detected
            clearTimeout(tapTimeout);
            handleDoubleTap();
          } else {
            // Single tap - wait for potential double tap
            tapTimeout = setTimeout(() => {
              // Single tap confirmed - do nothing for mobile
            }, 600);
          }
          lastTap = currentTime;
        }
      });

      // Click to set value with double tap detection (for desktop)
      track.addEventListener("click", (e) => {
        // Only handle clicks on desktop (not touch devices)
        if (!("ontouchstart" in window)) {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;

          if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            clearTimeout(tapTimeout);
            handleDoubleTap();
          } else {
            // Single tap - wait for potential double tap
            tapTimeout = setTimeout(() => {
              // Single tap confirmed - just update the slider
              updateSlider(e.clientY);
            }, 500);
          }
          lastTap = currentTime;
        }
      });
    });
  };

  const updateGain = async (stripId, gain) => {
    try {
      await fetch(`/api/strips/${stripId}/gain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gain: gain }),
      });
    } catch (error) {
      console.error("Error updating gain:", error);
    }
  };

  // Prevent zoom on double tap for mobile - but only on non-slider elements
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    function (event) {
      // Only prevent zoom on non-slider elements
      if (!event.target.closest(".vertical-slider-track")) {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }
    },
    false
  );

  // Handle mute button clicks
  stripsContainer.addEventListener("click", async (event) => {
    if (event.target.classList.contains("mute-button")) {
      event.preventDefault();
      const stripId = event.target.dataset.stripId;
      const isMuted = event.target.classList.contains("muted");

      // Add visual feedback
      event.target.style.transform = "scale(0.95)";
      setTimeout(() => {
        event.target.style.transform = "";
      }, 150);

      await fetch(`/api/strips/${stripId}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mute: !isMuted }),
      });
      fetchStrips(); // Refresh UI
    }

    // Handle A1 button clicks
    if (event.target.classList.contains("a1-button")) {
      event.preventDefault();
      const stripId = event.target.dataset.stripId;
      const isEnabled = event.target.classList.contains("enabled");

      // Add visual feedback
      event.target.style.transform = "scale(0.95)";
      setTimeout(() => {
        event.target.style.transform = "";
      }, 150);

      await fetch(`/api/strips/${stripId}/a1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !isEnabled }),
      });
      fetchStrips(); // Refresh UI
    }

    // Handle A2 button clicks
    if (event.target.classList.contains("a2-button")) {
      event.preventDefault();
      const stripId = event.target.dataset.stripId;
      const isEnabled = event.target.classList.contains("enabled");

      // Add visual feedback
      event.target.style.transform = "scale(0.95)";
      setTimeout(() => {
        event.target.style.transform = "";
      }, 150);

      await fetch(`/api/strips/${stripId}/a2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !isEnabled }),
      });
      fetchStrips(); // Refresh UI
    }
  });

  fetchStrips();
});
