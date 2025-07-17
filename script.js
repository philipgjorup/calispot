class CaliSpotMap {
  constructor() {
    console.log('CaliSpotMap: constructor called');
    this.initMap();
    this.initCustomZoom();
  }

  initMap() {
    console.log('CaliSpotMap: Initializing map...');
    this.map = L.map('map', {
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0
    }).setView([20, 0], 2);
    console.log('CaliSpotMap: Map view set to [20, 0], zoom 2');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(this.map);
    console.log('CaliSpotMap: OSM tile layer added');

    // Create marker cluster group with custom icon creation
    this.markerCluster = L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 20) size = 'large';
        else if (count >= 10) size = 'medium';
        return L.divIcon({
          html: `<div class="custom-cluster">${count}</div>`,
          className: 'cali-cluster cali-cluster-' + size,
          iconSize: L.point(40, 40)
        });
      }
    });

    // Load locations and add marker
    fetch('data/locations.json')
      .then(response => response.json())
      .then(locations => {
        let markerCount = 0;
        locations.forEach(loc => {
          const marker = L.circleMarker([loc.lat, loc.lng], {
            radius: 9,
            color: '#000', // black border
            weight: 2,
            fillColor: '#ff6b35',
            fillOpacity: 1
          });
          this.markerCluster.addLayer(marker);
          markerCount++;
          console.log(`Added marker ${markerCount}: ${loc.name}`);
        });
        this.map.addLayer(this.markerCluster);
        console.log(`Added ${markerCount} markers successfully`);
      })
      .catch(err => console.error('Error loading locations:', err));
  }

  initCustomZoom() {
    document.addEventListener('DOMContentLoaded', () => {
      const zoomInBtn = document.getElementById('zoom-in');
      const zoomOutBtn = document.getElementById('zoom-out');
      if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', () => {
          if (this.map) this.map.zoomIn();
        });
        zoomOutBtn.addEventListener('click', () => {
          if (this.map) this.map.zoomOut();
        });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  new CaliSpotMap();
}); 