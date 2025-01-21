import win32gui
import win32con
import mss
import numpy as np
from PIL import Image
import win32api
import cv2

# Define your game title and desired dimensions
game_title = "Raid: Shadow Legends"  # Replace with your game's window title

window_x = 0
window_y = 0
window_width = 1280
window_height = 720

def find_window_by_title(title):
    def enum_windows_callback(hwnd, hwnd_list):
        if win32gui.IsWindowVisible(hwnd) and title.lower() in win32gui.GetWindowText(hwnd).lower():
            hwnd_list.append(hwnd)
    hwnd_list = []
    win32gui.EnumWindows(enum_windows_callback, hwnd_list)
    return hwnd_list

# Find the game window
hwnd_list = find_window_by_title(game_title)

if hwnd_list:
    hwnd = hwnd_list[0]  # Use the first matching window
    print(f"Found game window: {win32gui.GetWindowText(hwnd)}")

    # Get the current window position
    rect = win32gui.GetWindowRect(hwnd)
    window_x = rect[0]
    window_y = rect[1]

    # Resize the window while keeping its current position
    win32gui.MoveWindow(hwnd, window_x, window_y, window_width, window_height, True)  # (x, y, width, height, repaint)
    print(f"Window resized to {window_width}x{window_height} at position {window_x}, {window_y}")
else:
    print("Game window not found. Make sure the game is open.")
    
# Update the monitor region to match the game window's dimensions
monitor = {
    "top": window_y,
    "left": window_x,
    "width": window_width,
    "height": window_height
}

# Capture the screenshot of the specified region
with mss.mss() as sct:
    screenshot = sct.grab(monitor)

    # Convert the raw screenshot to a NumPy array
    img_array = np.array(screenshot)

    # If the screenshot is in BGR format, swap it to RGB
    img_array = img_array[..., :3]  # Get only the RGB channels (if needed)
    img_array = img_array[:, :, ::-1]  # Reverse the last axis (BGR -> RGB)

    # Convert the NumPy array back to a Pillow Image
    img = Image.fromarray(img_array)

    # Show the image using Pillow
    img.show()

def mouse_click_callback(event, x, y, flags=None, param=None):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"Mouse clicked at ({x}, {y}) in the OpenCV window")

# Set up OpenCV window to capture mouse events
cv2.namedWindow("Game Window")
cv2.setMouseCallback("Game Window", mouse_click_callback)

# Display the captured screenshot in the OpenCV window
cv2.imshow("Game Window", img_array)

# Wait for a key press and close the window
cv2.waitKey(0)
cv2.destroyAllWindows()

# Check if there is red on coordinates (526, 573)
red_pixel = img_array[573, 526]

# Define the red color threshold
red_threshold = np.array([200, 0, 0])  # Adjust the threshold as needed

if np.all(red_pixel >= red_threshold):
    print("Red detected at (526, 573). Clicking at (450, 498).")
    
    # Adjust the click coordinates relative to the game window's position
    click_x = window_x + 450
    click_y = window_y + 498
    # Move the mouse to the adjusted coordinates and click
    win32api.SetCursorPos((click_x, click_y))
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, click_x, click_y, 0, 0)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, click_x, click_y, 0, 0)
else:
    print("Red not detected at (526, 573).")
