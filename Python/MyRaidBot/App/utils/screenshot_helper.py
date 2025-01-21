import mss
import numpy as np
from PIL import Image

def capture_screenshot(monitor):
    
    # Capture the screenshot of the specified region
    with mss.mss() as sct:
        screenshot = sct.grab(monitor)

        # Convert the raw screenshot to a NumPy array
        img_array = np.array(screenshot)

        # If the screenshot is in BGR format, swap it to RGB
        img_array = img_array[..., :3]  # Get only the RGB channels (if needed)
        img_array = img_array[:, :, ::-1]  # Reverse the last axis (BGR -> RGB)

        # Return the NumPy array
        return img_array
