
import { RESTAURANTS } from './data';

export const generateMapHTML = (userLat: number, userLng: number) => {
  const restaurantsJSON = JSON.stringify(RESTAURANTS);

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            #map { width: 100vw; height: 100vh; }
            .popup-content {
                padding: 12px;
                text-align: center;
                min-width: 150px;
            }
            .popup-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 4px;
            }
            .popup-cuisine {
                color: #666;
                font-size: 14px;
                margin-bottom: 4px;
            }
            .popup-rating {
                color: #FFC107;
                font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            try {
              const map = L.map('map', {
                zoomControl: true,
                attributionControl: false
              }).setView([${userLat}, ${userLng}], 15);

              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
              }).addTo(map);

              const restaurants = ${restaurantsJSON};

              const restaurantIcon = L.divIcon({
                html: \`
                  <div style="width: 32px; height: 32px; position: relative;">
                    <div style="width: 32px; height: 32px; background: #ef4444; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                  </div>
                \`,
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16],
              });

              restaurants.forEach(restaurant => {
                const marker = L.marker([restaurant.lat, restaurant.lng], {
                  icon: restaurantIcon
                }).addTo(map);

                marker.bindPopup(\`
                  <div class="popup-content">
                    <div class="popup-name">\${restaurant.name}</div>
                    <div class="popup-cuisine">\${restaurant.cuisine}</div>
                    <div class="popup-rating">⭐ \${restaurant.rating}</div>
                    <div style="font-size:12px; color:#999; margin-top:4px;">\${restaurant.distance}</div>
                  </div>
                \`);
              });

              const userIcon = L.divIcon({
                html: \`
                  <div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
                \`,
                className: '',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

              L.marker([${userLat}, ${userLng}], { icon: userIcon })
                .bindPopup('<div class="popup-content"><strong>You are here</strong></div>')
                .addTo(map);

            } catch (error) {
               console.log(error);
            }
          </script>
        </body>
      </html>
    `;
};
