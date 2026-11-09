import os
from PIL import Image
import create_app_icon

def main():
    print("Generating master icon...")
    create_app_icon.create_master_icon()
    print("Master icon updated. Running tauri icon to sync all formats...")
    os.system("npx @tauri-apps/cli icon app-icon.png")
    print("All icons generated and synchronized successfully!")

if __name__ == "__main__":
    main()
