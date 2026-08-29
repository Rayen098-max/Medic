from PIL import Image, ImageOps

def process_arrow():
    path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e7bf953d-7705-45c8-9ffa-bcebd76df5f6\.user_uploaded\media_1788019025207.png"
    out_path = r"C:\Users\Admin\Desktop\Medic\public\arrow-logo-new.png"
    
    img = Image.open(path).convert("RGBA")
    
    # We want to remove the white background.
    # Let's find all pixels that are purely white or very close to it and make them transparent.
    # But a neon glow fades into white, so it's a gradient.
    # Let's extract the alpha channel based on "distance from white".
    # Gray = 0.299*R + 0.587*G + 0.114*B
    # Distance from white = 255 - Gray
    gray = img.convert("L")
    alpha = ImageOps.invert(gray)
    
    # The user wants to reuse the same cyan tone: #00d2ff
    cyan = Image.new("RGBA", img.size, (0, 210, 255, 255))
    
    # But wait! If the original arrow had a white core, inverted it will be black (transparent).
    # This means the cyan arrow will only be the "glow" part, leaving the core empty.
    # If we want the core to be solid cyan as well, we can just apply a threshold to the alpha.
    # Let's threshold it: anything darker than a certain threshold becomes fully opaque cyan.
    def threshold(p):
        return 255 if p > 20 else 0
        
    alpha_solid = alpha.point(threshold)
    cyan.putalpha(alpha_solid)
    
    # Crop to bounding box
    bbox = alpha_solid.getbbox()
    if bbox:
        cyan = cyan.crop(bbox)
        
    # Rotate upward! The user said:
    # "Tilt/rotate the arrow so it points upward (currently pointing right in the reference image)"
    # Right to Up is 90 degrees counter-clockwise.
    cyan = cyan.rotate(90, expand=True)
    
    # Resize and pad into a square
    max_dim = max(cyan.width, cyan.height)
    pad = int(max_dim * 0.2)
    square_size = max_dim + pad * 2
    
    square = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    offset = ((square_size - cyan.width) // 2, (square_size - cyan.height) // 2)
    square.paste(cyan, offset)
    
    square.save(out_path)
    print("Saved to", out_path)

process_arrow()
