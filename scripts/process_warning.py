from PIL import Image, ImageOps

def process_warning():
    path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e7bf953d-7705-45c8-9ffa-bcebd76df5f6\.user_uploaded\media_1788103179284.png"
    out_path = r"C:\Users\Admin\Desktop\Medic\public\warning-logo-new.png"
    
    img = Image.open(path).convert("RGBA")
    
    # Check if the image has a white background and make it transparent, or just use alpha
    # Since it's a black and white image, we'll invert it to use as alpha
    gray = img.convert("L")
    alpha = ImageOps.invert(gray)
    
    # But wait, the warning icon has a black triangle and exclamation mark on white?
    # Let's assume it's black on white or transparent. If it's black on white:
    # `alpha = ImageOps.invert(gray)` will make black areas opaque and white areas transparent.
    
    dark_blue = (15, 23, 42, 255)
    cyan = Image.new("RGBA", img.size, dark_blue)
    
    def threshold(p):
        return 255 if p > 50 else 0
        
    alpha_solid = alpha.point(threshold)
    cyan.putalpha(alpha_solid)
    
    bbox = alpha_solid.getbbox()
    if bbox:
        cyan = cyan.crop(bbox)
        
    max_dim = max(cyan.width, cyan.height)
    pad = int(max_dim * 0.2)
    square_size = max_dim + pad * 2
    
    square = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    offset = ((square_size - cyan.width) // 2, (square_size - cyan.height) // 2)
    square.paste(cyan, offset)
    
    square.save(out_path)
    print("Saved warning to", out_path)

process_warning()
