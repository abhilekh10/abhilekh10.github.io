import os
import re

# Mapping of destinations to working Unsplash image URLs
image_mapping = {
    'dest-maldives.html': [
        'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=500&h=500&fit=crop',  # Maldives villa
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop',  # Blue ocean
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=500&fit=crop',  # Beach
        'https://images.unsplash.com/photo-1489749798305-4fea3ba63d60?w=500&h=500&fit=crop',  # Seaplane
        'https://images.unsplash.com/photo-1583212192454-1fe6229603b7?w=500&h=500&fit=crop',  # Underwater
        'https://images.unsplash.com/photo-1495954484750-af469f1357be?w=500&h=500&fit=crop',  # Sunset
    ],
    'dest-santorini.html': [
        'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=500&h=500&fit=crop',  # Santorini caldera
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500&h=500&fit=crop',  # Sunset
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',  # White houses
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop',  # Aegean sea
        'https://images.unsplash.com/photo-1559935395-c1400ca199e0?w=500&h=500&fit=crop',  # Wine
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=500&fit=crop',  # Yacht
    ],
    'dest-amalfi.html': [
        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=500&h=500&fit=crop',  # Amalfi coast
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',  # Cliffs
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=500&fit=crop',  # Yacht
        'https://images.unsplash.com/photo-1504674900152-b8b0e382c413?w=500&h=500&fit=crop',  # Restaurant
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=500&fit=crop',  # Garden
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop',  # Water
    ],
}

for filename, urls in image_mapping.items():
    filepath = os.path.join('.', filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all img src with images/hero.jpg
        pattern = r'<img src="images/hero.jpg" alt="([^"]*)">'
        matches = re.finditer(pattern, content)
        match_list = list(matches)
        
        for i, match in enumerate(match_list):
            if i < len(urls):
                old = match.group(0)
                new = f'<img src="{urls[i]}" alt="{match.group(1)}">'
                content = content.replace(old, new, 1)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")

print("All images updated!")
