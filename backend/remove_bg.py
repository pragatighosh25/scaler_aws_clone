import os
from PIL import Image

def remove_background(input_path, output_path, tolerance=35):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} does not exist")
        return

    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    # Identify background color from top-left pixel
    bg_color = img.getpixel((0, 0))
    # If top-left is already transparent, assume white background
    if bg_color[3] == 0:
        bg_color = (255, 255, 255, 255)
        
    print(f"Detected background color to remove: {bg_color[:3]}")
    
    datas = img.getdata()
    newData = []
    for item in datas:
        # Distance between current pixel and background color
        dist = sum((a - b) ** 2 for a, b in zip(item[:3], bg_color[:3])) ** 0.5
        if dist < tolerance:
            newData.append((0, 0, 0, 0)) # Fully transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Successfully saved background-removed image to {output_path}")

if __name__ == "__main__":
    remove_background(
        "d:/scaler_aws_clone/frontend/public/amazon_logo.webp",
        "d:/scaler_aws_clone/frontend/public/amazon_logo_transparent.png"
    )
