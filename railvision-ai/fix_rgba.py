import os
import glob
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # regex to find rgba(r, g, b, a) and remove spaces inside the parenthesis
    def replacer(match):
        return match.group(0).replace(" ", "")

    new_content = re.sub(r'rgba\([^)]+\)', replacer, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            fix_file(os.path.join(root, file))

