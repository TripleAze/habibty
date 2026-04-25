import os
import re

directories = ['app', 'components']

replacements = [
    (re.compile(r"'Cormorant Garamond'"), 'var(--font-cormorant)'),
    (re.compile(r"\"Cormorant Garamond\""), 'var(--font-cormorant)'),
    (re.compile(r"'DM Sans'"), 'var(--font-dm-sans)'),
    (re.compile(r"\"DM Sans\""), 'var(--font-dm-sans)')
]

import_regex = re.compile(r"@import url\('https://fonts\.googleapis\.com/css2\?family=.*?'\);")

for dir_name in directories:
    for root, dirs, files in os.walk(dir_name):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.css'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                new_content = content
                for regex, replacement in replacements:
                    new_content = regex.sub(replacement, new_content)
                
                new_content = import_regex.sub('', new_content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
