import re

def reorder():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    slides_start = html.find('<div id="slides">')
    nav_start = html.find('<!-- Navigation -->')

    pre_slides = html[:slides_start + len('<div id="slides">\n')]
    post_slides = html[nav_start:]
    slides_content = html[slides_start + len('<div id="slides">\n'):nav_start]

    slide_starts = [m.start() for m in re.finditer(r'<div class="slide', slides_content)]
    
    slides = []
    for i in range(len(slide_starts)):
        start = slide_starts[i]
        # prev_end is from where we start capturing for this slide.
        prev_end = slide_starts[i-1] if i > 0 else 0
        end = slide_starts[i+1] if i + 1 < len(slide_starts) else len(slides_content)
        
        # We slice from prev_end to end to get the comment + the slide.
        # But wait! If we do prev_end to end, we are capturing from the PREVIOUS slide's <div class="slide" ?
        # No! If prev_end is slide_starts[i-1], we are capturing the previous slide's body!
        # Ah! slide_starts[i] is where `<div class="slide"` begins.
        # We want to capture the comment ABOVE the slide.
        # So we should split slides_content by finding the comment `<!-- SLIDE`.
        pass
        
    # Better: Split by `<!-- SLIDE`
    # Let's find all `<!-- SLIDE` indices
    slide_starts = [m.start() for m in re.finditer(r'<!-- SLIDE', slides_content)]
    slides = []
    for i in range(len(slide_starts)):
        start = slide_starts[i]
        end = slide_starts[i+1] if i + 1 < len(slide_starts) else len(slides_content)
        slides.append(slides_content[start:end])

    print(f"Found {len(slides)} slides by <!-- SLIDE")
    # Wait, there are 13 <!-- SLIDE comments because of the duplicate on slide 11.
    # Let's clean the HTML so there are exactly 12 `<!-- SLIDE` tags!
    # Let's just fix it by string replacement before slicing.
    slides_content = slides_content.replace('<!-- SLIDE 12: Final with Demo Video -->\n', '')
    
    slide_starts = [m.start() for m in re.finditer(r'<!-- SLIDE', slides_content)]
    slides = []
    for i in range(len(slide_starts)):
        start = slide_starts[i]
        end = slide_starts[i+1] if i + 1 < len(slide_starts) else len(slides_content)
        slides.append(slides_content[start:end])
        
    print(f"Found {len(slides)} slides after cleaning")
    
    if len(slides) != 12:
        print("Error: Expected 12 slides")
        return

    new_order = [0, 1, 2, 4, 7, 5, 6, 3, 8, 9, 10, 11]
    new_slides = [slides[i] for i in new_order]

    new_slides_content = "".join(new_slides)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(pre_slides + new_slides_content + post_slides)
        
    print("Rewrote index.html")

reorder()
