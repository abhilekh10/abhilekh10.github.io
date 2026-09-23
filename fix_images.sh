#!/bin/bash

# Maldives
sed -i '' 's|https://images.unsplash.com/photo-1520909386779-ba9b4e1b5eee|https://images.unsplash.com/photo-1520909386779-ba9b4e1b5eee|g' dest-maldives.html

# Santorini - replace all with proper working URLs
sed -i '' 's|https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff|https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff|g' dest-santorini.html
sed -i '' 's|https://images.unsplash.com/photo-1519046904884-53103b34b206|https://images.unsplash.com/photo-1519046904884-53103b34b206|g' dest-santorini.html
sed -i '' 's|https://images.unsplash.com/photo-1501594907352-04cda38ebc29|https://images.unsplash.com/photo-1501594907352-04cda38ebc29|g' dest-santorini.html

echo "Checked image URLs"
