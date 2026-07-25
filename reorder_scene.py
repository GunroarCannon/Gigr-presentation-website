import re

with open('scene.js', 'r', encoding='utf-8') as f:
    scene_js = f.read()

# We need to rewrite the updateSlide method switch cases.
# Also we need to rewrite the slideGroups assignments in _createSlideObjects

# Old -> New
# 0 -> 0
# 1 -> 1
# 2 -> 2
# 4 (Solution / net) -> 3
# 7 (Platform / map) -> 4
# 5 (Web3) -> 5
# 6 (AI) -> 6
# 3 (Frictionless / globe) -> 7
# 8 (Business / knot) -> 8
# 9 (Competitive / gears) -> 9
# 10 (Demo / video - no logic) -> 10  --- Wait, the video slide is 10. Does it have logic? No, the original 10 was Final.
# 11 (Final / globe - was 10) -> 11

# So, replace:
# this.slideGroups[3] -> this.slideGroups[7]
# this.slideGroups[4] -> this.slideGroups[3]
# this.slideGroups[7] -> this.slideGroups[4]
# this.slideGroups[10] -> this.slideGroups[11]

scene_js = scene_js.replace("const g = this.slideGroups[3];", "const g = this.slideGroups[7]; // Was 3")
scene_js = scene_js.replace("const g = this.slideGroups[4];", "const g = this.slideGroups[3]; // Was 4")
scene_js = scene_js.replace("const g = this.slideGroups[7];", "const g = this.slideGroups[4]; // Was 7")
scene_js = scene_js.replace("const g = this.slideGroups[10];", "const g = this.slideGroups[11]; // Was 10")

# updateSlide cases:
# case 3: -> case 7:
# case 4: -> case 3:
# case 7: -> case 4:
# case 10: -> case 11:

# Let's use regex to safely replace the exact cases in updateSlide
# We only want to replace `case X:`
scene_js = scene_js.replace("case 3:", "case 7: // Was 3")
scene_js = scene_js.replace("case 4:", "case 3: // Was 4")
scene_js = scene_js.replace("case 7:", "case 4: // Was 7")
scene_js = scene_js.replace("case 10:", "case 11: // Was 10")

# Wait, `case 7` was replaced by `case 4: // Was 7`, but what if I replaced `case 3` with `case 7: // Was 3` FIRST?
# Then the third replace `case 7:` would also match `case 7: // Was 3` !
# Ah, I need to be careful with replace order or use exact matching!

# Let's reload and do exact matching:
with open('scene.js', 'r', encoding='utf-8') as f:
    scene_js = f.read()

scene_js = scene_js.replace("const g = this.slideGroups[3];", "const g = this.slideGroups[993];")
scene_js = scene_js.replace("const g = this.slideGroups[4];", "const g = this.slideGroups[994];")
scene_js = scene_js.replace("const g = this.slideGroups[7];", "const g = this.slideGroups[997];")
scene_js = scene_js.replace("const g = this.slideGroups[10];", "const g = this.slideGroups[9910];")

scene_js = scene_js.replace("const g = this.slideGroups[993];", "const g = this.slideGroups[7];")
scene_js = scene_js.replace("const g = this.slideGroups[994];", "const g = this.slideGroups[3];")
scene_js = scene_js.replace("const g = this.slideGroups[997];", "const g = this.slideGroups[4];")
scene_js = scene_js.replace("const g = this.slideGroups[9910];", "const g = this.slideGroups[11];")

scene_js = scene_js.replace("case 3:", "case 993:")
scene_js = scene_js.replace("case 4:", "case 994:")
scene_js = scene_js.replace("case 7:", "case 997:")
scene_js = scene_js.replace("case 10:", "case 9910:")

scene_js = scene_js.replace("case 993:", "case 7:")
scene_js = scene_js.replace("case 994:", "case 3:")
scene_js = scene_js.replace("case 997:", "case 4:")
scene_js = scene_js.replace("case 9910:", "case 11:")

with open('scene.js', 'w', encoding='utf-8') as f:
    f.write(scene_js)

print("Updated scene.js")
