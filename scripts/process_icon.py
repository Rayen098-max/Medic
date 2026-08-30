from PIL import Image, ImageOps

def process_icon():
    path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e7bf953d-7705-45c8-9ffa-bcebd76df5f6\.user_uploaded\media_1788018563666.png"
    out_path = r"C:\Users\Admin\Desktop\Medic\public\exercise-logo-new.png"
    
    img = Image.open(path).convert("RGBA")
    gray = img.convert("L")
    alpha = ImageOps.invert(gray)
    
    # Dark blue/navy tone for the icon
    dark_blue = (15, 23, 42, 255)
    cyan = Image.new("RGBA", img.size, dark_blue)
    cyan.putalpha(alpha)
    
    bbox = alpha.getbbox()
    if bbox:
        cyan = cyan.crop(bbox)
        
    max_dim = max(cyan.width, cyan.height)
    pad = int(max_dim * 0.2)
    square_size = max_dim + pad * 2
    
    square = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    offset = ((square_size - cyan.width) // 2, (square_size - cyan.height) // 2)
    square.paste(cyan, offset)
    
    square.save(out_path)
    print("Saved icon to", out_path)

process_icon()
