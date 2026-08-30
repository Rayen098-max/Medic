from PIL import Image, ImageOps

def process_icon():
    path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e7bf953d-7705-45c8-9ffa-bcebd76df5f6\.user_uploaded\media_1788110050197.png"
    out_path = r"C:\Users\Admin\Desktop\Medic\public\warning-logo-new.png"
    
    img = Image.open(path).convert("RGBA")
    
    # We want the icon to be dark navy #0f172a (15, 23, 42)
    dark_blue = (15, 23, 42, 255)
    
    # Check if the image has a transparent background
    # If it has an alpha channel where some pixels are < 255, we assume it's transparent
    
    data = img.getdata()
    
    # Create a new image with the target color
    new_img = Image.new("RGBA", img.size)
    new_data = []
    
    # To determine if the image is black-on-white or black-on-transparent
    # Let's just find the darkest pixels and make them dark blue, and everything else transparent.
    # Wait, the warning icon has a white background in the screenshot attached to the prompt!
    # If the image is black on a white background:
    for item in data:
        r, g, b, a = item
        # If it's bright (close to white), make it transparent
        if r > 200 and g > 200 and b > 200:
            new_data.append((0, 0, 0, 0))
        # If it's dark (the icon itself), make it dark blue
        elif a > 50:
            new_data.append(dark_blue)
        else:
            new_data.append((0, 0, 0, 0))
            
    new_img.putdata(new_data)
    
    bbox = new_img.getbbox()
    if bbox:
        new_img = new_img.crop(bbox)
        
    max_dim = max(new_img.width, new_img.height)
    pad = int(max_dim * 0.15)
    square_size = max_dim + pad * 2
    
    square = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    offset = ((square_size - new_img.width) // 2, (square_size - new_img.height) // 2)
    square.paste(new_img, offset)
    
    square.save(out_path)
    print("Saved fixed warning to", out_path)

process_icon()
