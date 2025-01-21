import win32gui

# Define your game title and desired dimensions
game_title = "Raid: Shadow Legends"  # Replace with your game's window title

monitor = {
    "left": 0,
    "top": 0,
    "width": 1280,
    "height": 720
}

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
    monitor["left"] = rect[0]
    monitor["top"] = rect[1]

    # Resize the window while keeping its current position
    win32gui.MoveWindow(hwnd, monitor["left"], monitor["top"], monitor["width"], monitor["height"], True)  # (x, y, width, height, repaint)
    print(f"Window resized to {monitor["width"]}x{monitor["height"]} at position {monitor["left"]}, {monitor["top"]}")
else:
    print("Game window not found. Make sure the game is open.")
 
