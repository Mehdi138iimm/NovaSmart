import os
from PIL import Image, ImageDraw, ImageFilter

def create_master_icon():
    # Render at 4x resolution for pristine anti-aliasing
    scale = 4
    canvas_size = 1024 * scale  # 4096 x 4096
    
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    # Capsule dimensions (scaled)
    # Target in 1024: w = 840, h = 450, radius = 225
    w = int(840 * scale)
    h = int(450 * scale)
    x0 = (canvas_size - w) // 2
    y0 = (canvas_size - h) // 2
    x1 = x0 + w
    y1 = y0 + h
    radius = h // 2

    # 1. Soft Outer Drop Shadow
    shadow_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_offset_y = int(32 * scale)
    shadow_spread = int(12 * scale)
    shadow_draw.rounded_rectangle(
        [x0 - shadow_spread, y0 + shadow_offset_y, x1 + shadow_spread, y1 + shadow_offset_y + shadow_spread],
        radius=radius + shadow_spread,
        fill=(0, 0, 0, 180)
    )
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(int(36 * scale)))
    img = Image.alpha_composite(img, shadow_img)

    # 2. Main Capsule Body (Deep obsidian dark with subtle metallic rim)
    body_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    body_draw = ImageDraw.Draw(body_img)
    
    # Outer dark titanium rim
    rim_width = int(12 * scale)
    body_draw.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=radius,
        fill=(12, 13, 16, 255),
        outline=(52, 54, 64, 255),
        width=rim_width
    )
    img = Image.alpha_composite(img, body_img)

    # 3. Inner subtle top highlight rim for depth
    highlight_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    hl_draw = ImageDraw.Draw(highlight_img)
    hl_inset = int(4 * scale)
    hl_draw.rounded_rectangle(
        [x0 + hl_inset, y0 + hl_inset, x1 - hl_inset, y1 - hl_inset],
        radius=radius - hl_inset,
        outline=(80, 84, 98, 70),
        width=int(4 * scale)
    )
    img = Image.alpha_composite(img, highlight_img)

    # 4. Eyes parameters
    # In 1024: eye_w = 92, eye_h = 184, eye_gap = 96
    eye_w = int(92 * scale)
    eye_h = int(184 * scale)
    eye_gap = int(96 * scale)
    cx = canvas_size // 2
    cy = canvas_size // 2

    left_eye_x0 = cx - eye_gap // 2 - eye_w
    left_eye_x1 = left_eye_x0 + eye_w
    right_eye_x0 = cx + eye_gap // 2
    right_eye_x1 = right_eye_x0 + eye_w
    eye_y0 = cy - eye_h // 2
    eye_y1 = cy + eye_h // 2
    eye_radius = eye_w // 2

    # 5. Eyes Ambient Glow (soft bloom)
    glow_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_pad = int(16 * scale)
    glow_draw.rounded_rectangle(
        [left_eye_x0 - glow_pad, eye_y0 - glow_pad, left_eye_x1 + glow_pad, eye_y1 + glow_pad],
        radius=eye_radius + glow_pad,
        fill=(255, 255, 255, 140)
    )
    glow_draw.rounded_rectangle(
        [right_eye_x0 - glow_pad, eye_y0 - glow_pad, right_eye_x1 + glow_pad, eye_y1 + glow_pad],
        radius=eye_radius + glow_pad,
        fill=(255, 255, 255, 140)
    )
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(int(20 * scale)))
    img = Image.alpha_composite(img, glow_img)

    # 6. Solid Crisp Glowing White Eyes
    eyes_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    eyes_draw = ImageDraw.Draw(eyes_img)
    eyes_draw.rounded_rectangle(
        [left_eye_x0, eye_y0, left_eye_x1, eye_y1],
        radius=eye_radius,
        fill=(255, 255, 255, 255)
    )
    eyes_draw.rounded_rectangle(
        [right_eye_x0, eye_y0, right_eye_x1, eye_y1],
        radius=eye_radius,
        fill=(255, 255, 255, 255)
    )
    img = Image.alpha_composite(img, eyes_img)

    # 7. Downsample with Lanczos to master 1024x1024
    master_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    out_path = r"D:\novasmart-spec-build\app-icon.png"
    master_1024.save(out_path, format="PNG")
    print(f"Master 1024x1024 icon generated at: {out_path}")

if __name__ == "__main__":
    create_master_icon()
