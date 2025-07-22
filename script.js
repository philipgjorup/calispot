class CaliSpotMap {
  constructor() {
    console.log('CaliSpotMap: constructor called');
    this.locations = [];
    this.markers = [];
    this.userMarker = null;
    this.currentFilter = 'All Equipment';
    this.initMap();
    this.initCustomZoom();
    this.initNearMe();
    this.initChooseLocation();
    this.initEquipmentFilter();
    this.initFooterModals();
    this.initGlobalEventListeners();
  }

  async initMap() {
    try {
      // Fetch locations data
      const response = await fetch('data/locations.json');
      this.locations = await response.json();
      console.log('Loaded locations:', this.locations.length);

      // Initialize map
      this.map = L.map('map').setView([55.6761, 12.5683], 10);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Create marker cluster group
      this.markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50
      });

      // Add markers for each location
      this.locations.forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
          icon: this.createCustomIcon(location.equipment)
        });
        
        // Store location data with marker
        marker.locationData = location;
        
        // Add click event to marker
        marker.on('click', () => {
          this.showLocationDetails(location);
        });
        
        this.markers.push(marker);
        this.markerClusterGroup.addLayer(marker);
      });

      this.map.addLayer(this.markerClusterGroup);
      console.log('Map initialized with', this.markers.length, 'markers');

    } catch (error) {
      console.error('Error initializing map:', error);
    }
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

  initNearMe() {
    const nearMeBtn = document.getElementById('near-me');
    if (!nearMeBtn) return;
    nearMeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleNearMe();
    });
  }

  handleNearMe() {
    this.clearMapMessage();
    this.showLoadingMessage('Requesting your location...');
    
    if (!navigator.geolocation) {
      this.hideLoadingMessage();
      this.showMapMessage('Geolocation is not supported by your browser.', 'error');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.hideLoadingMessage();
        const userLatLng = [pos.coords.latitude, pos.coords.longitude];
        this.showUserMarker(userLatLng);
        const nearby = this.getNearbyLocations(userLatLng, 10);
        this.showNearbyMarkers(nearby);
        
        if (nearby.length === 0) {
          this.showMapMessage('No workout spots within 10km. Try expanding your search or choose a location manually.', 'error');
        } else {
          this.showMapMessage(`Found ${nearby.length} workout spot${nearby.length === 1 ? '' : 's'} nearby!`, 'success');
        }
        
        this.map.setView(userLatLng, 13, {animate: true, duration: 0.8});
        this.setActiveNavButton('near-me');
      },
      (err) => {
        this.hideLoadingMessage();
        let errorMessage = 'Location permission denied. Try "Choose Location" instead.';
        
        if (err.code === 1) {
          errorMessage = 'Location access needed to find nearby spots. You can still browse all locations or choose a location manually.';
        } else if (err.code === 2) {
          errorMessage = 'Location unavailable. Please try again or choose a location manually.';
        } else if (err.code === 3) {
          errorMessage = 'Location request timed out. Please try again or choose a location manually.';
        }
        
        this.showMapMessage(errorMessage, 'error');
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 0}
    );
  }

  showLoadingMessage(text) {
    const loadingEl = document.getElementById('loading-message');
    const textEl = document.getElementById('loading-text');
    if (loadingEl && textEl) {
      textEl.textContent = text;
      loadingEl.style.display = 'flex';
    }
  }

  hideLoadingMessage() {
    const loadingEl = document.getElementById('loading-message');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  showUserMarker(latlng) {
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }
    this.userMarker = L.circleMarker(latlng, {
      radius: 10,
      color: '#0077ff',
      weight: 3,
      fillColor: '#00e676',
      fillOpacity: 0.9
    }).addTo(this.map);
    this.userMarker.bindTooltip('You are here', {direction: 'top', offset: [0, -10]});
  }

  getNearbyLocations(userLatLng, maxKm) {
    function haversine(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2-lat1)*Math.PI/180;
      const dLng = (lng2-lng1)*Math.PI/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return this.locations.filter(loc => {
      const d = haversine(userLatLng[0], userLatLng[1], loc.lat, loc.lng);
      return d <= maxKm;
    });
  }

  showNearbyMarkers(nearby) {
    this.markerClusterGroup.clearLayers();
    this.markers.forEach(marker => {
      const loc = marker.locationData;
      const isNearby = nearby.find(n => n.lat === loc.lat && n.lng === loc.lng);
      const matchesFilter = this.matchesCurrentFilter(loc);
      if (isNearby && matchesFilter) {
        this.markerClusterGroup.addLayer(marker);
      }
    });
    this.map.addLayer(this.markerClusterGroup);
  }

  showMapMessage(msg, type = 'info') {
    const el = document.getElementById('map-message');
    if (el) {
      el.textContent = msg;
      el.className = `map-message ${type}`;
      el.style.display = 'block';
    }
  }
  clearMapMessage() {
    const el = document.getElementById('map-message');
    if (el) el.style.display = 'none';
  }

  initChooseLocation() {
    const chooseBtn = document.getElementById('choose-location');
    const modal = document.getElementById('choose-location-modal');
    if (!chooseBtn || !modal) return;
    
    chooseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.populateCountryLists();
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('open'), 10);
      this.setActiveNavButton('choose-location');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal(modal);
    });
  }

  initGlobalEventListeners() {
    // Add ESC key functionality globally
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        console.log('ESC key pressed - closing all modals');
        this.closeAllModals();
        
        // Backup: force close after a short delay if normal close fails
        setTimeout(() => {
          const anyModalOpen = [
            'choose-location-modal',
            'privacy-modal', 
            'about-modal',
            'contact-modal',
            'add-location-modal',
            'location-details-modal'
          ].some(id => {
            const modal = document.getElementById(id);
            return modal && modal.style.display !== 'none';
          });
          
          if (anyModalOpen) {
            console.log('Backup: Force closing remaining modals');
            this.forceCloseAllModals();
          }
        }, 300);
      }
    });
  }

  initFooterModals() {
    // Privacy Notice
    const privacyBtn = document.getElementById('privacy-notice');
    const privacyModal = document.getElementById('privacy-modal');
    
    if (privacyBtn && privacyModal) {
      privacyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Privacy button clicked');
        this.openModal(privacyModal);
      });
      privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) {
          console.log('Privacy modal background clicked');
          this.closeModal(privacyModal);
        }
      });
    } else {
      console.error('Privacy modal elements not found:', {privacyBtn, privacyModal});
    }

    // About
    const aboutBtn = document.getElementById('about-calispot');
    const aboutModal = document.getElementById('about-modal');
    
    if (aboutBtn && aboutModal) {
      aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('About button clicked');
        this.openModal(aboutModal);
      });
      aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
          console.log('About modal background clicked');
          this.closeModal(aboutModal);
        }
      });
    } else {
      console.error('About modal elements not found:', {aboutBtn, aboutModal});
    }

    // Contact
    const contactBtn = document.getElementById('contact');
    const contactModal = document.getElementById('contact-modal');
    
    if (contactBtn && contactModal) {
      contactBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Contact button clicked');
        this.openModal(contactModal);
      });
      contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
          console.log('Contact modal background clicked');
          this.closeModal(contactModal);
        }
      });
    } else {
      console.error('Contact modal elements not found:', {contactBtn, contactModal});
    }

    // Add Location
    const addLocationBtn = document.getElementById('add-location');
    const addLocationModal = document.getElementById('add-location-modal');
    
    if (addLocationBtn && addLocationModal) {
      addLocationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Add location button clicked');
        this.openModal(addLocationModal);
      });
      addLocationModal.addEventListener('click', (e) => {
        if (e.target === addLocationModal) {
          console.log('Add location modal background clicked');
          this.closeModal(addLocationModal);
        }
      });
    } else {
      console.error('Add location modal elements not found:', {addLocationBtn, addLocationModal});
    }

    // Location Details Modal
    const locationDetailsModal = document.getElementById('location-details-modal');
    if (locationDetailsModal) {
      locationDetailsModal.addEventListener('click', (e) => {
        if (e.target === locationDetailsModal) {
          console.log('Location details modal background clicked');
          this.closeModal(locationDetailsModal);
        }
      });
    } else {
      console.error('Location details modal not found');
    }
  }

  openModal(modal) {
    if (modal) {
      console.log('Opening modal:', modal.id);
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('open'), 10);
    }
  }

  closeModal(modal) {
    if (modal) {
      console.log('Closing modal:', modal.id);
      modal.classList.remove('open');
      setTimeout(() => { 
        modal.style.display = 'none'; 
        console.log('Modal hidden:', modal.id);
      }, 250);
    }
  }

  closeAllModals() {
    console.log('Closing all modals');
    const modals = [
      document.getElementById('choose-location-modal'),
      document.getElementById('privacy-modal'),
      document.getElementById('about-modal'),
      document.getElementById('contact-modal'),
      document.getElementById('add-location-modal'),
      document.getElementById('location-details-modal')
    ];
    
    modals.forEach(modal => {
      if (modal && modal.style.display !== 'none') {
        console.log('Closing modal:', modal.id);
        this.closeModal(modal);
      }
    });
  }

  // Force close method as backup
  forceCloseAllModals() {
    console.log('Force closing all modals');
    const modals = [
      document.getElementById('choose-location-modal'),
      document.getElementById('privacy-modal'),
      document.getElementById('about-modal'),
      document.getElementById('contact-modal'),
      document.getElementById('add-location-modal'),
      document.getElementById('location-details-modal')
    ];
    
    modals.forEach(modal => {
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        console.log('Force closed modal:', modal.id);
      }
    });
  }

  createCustomIcon(equipment) {
    // Create a custom icon based on equipment type
    const hasMultipleEquipment = equipment.length > 1;
    const iconSize = hasMultipleEquipment ? 20 : 16;
    
    return L.divIcon({
      html: `<div class="custom-marker ${hasMultipleEquipment ? 'multi-equipment' : 'single-equipment'}">🏋️</div>`,
      className: 'custom-marker-icon',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize/2, iconSize/2]
    });
  }

  populateCountryLists() {
    const countryMap = {};
    this.locations.forEach(loc => {
      const country = this.getCountryForLocation(loc);
      if (!countryMap[country]) countryMap[country] = [];
      countryMap[country].push(loc);
    });
    
    // Convert to array and sort by location count
    const countryArray = Object.entries(countryMap).map(([name, locations]) => ({
      name,
      count: locations.length,
      flag: this.getCountryFlag(name)
    })).sort((a, b) => b.count - a.count);
    
    // Take top 3-4 for popular, rest for other
    const popular = countryArray.slice(0, Math.min(4, countryArray.length));
    const other = countryArray.slice(Math.min(4, countryArray.length)).sort((a, b) => a.name.localeCompare(b.name));
    
    const popList = document.getElementById('popular-countries');
    const othList = document.getElementById('other-countries');
    if (popList) popList.innerHTML = '';
    if (othList) othList.innerHTML = '';
    
    popular.forEach(c => {
      const li = document.createElement('li');
      li.className = 'popular-country';
      li.innerHTML = `<span class="flag">${c.flag}</span> ${c.name} (${c.count} ${c.count === 1 ? 'location' : 'locations'})`;
      li.addEventListener('click', () => {
        this.zoomToCountry(c.name);
        this.closeModal();
      });
      popList.appendChild(li);
    });
    
    other.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="flag">${c.flag}</span> ${c.name} (${c.count} ${c.count === 1 ? 'location' : 'locations'})`;
      li.addEventListener('click', () => {
        this.zoomToCountry(c.name);
        this.closeModal();
      });
      othList.appendChild(li);
    });
  }

  getCountryForLocation(loc) {
    // Simple hardcoded mapping by lat/lng for this dataset
    if (loc.lat > 54 && loc.lat < 58 && loc.lng > 8 && loc.lng < 14) return 'Denmark';
    if (loc.lat > 35 && loc.lat < 36 && loc.lng > 139 && loc.lng < 140) return 'Japan';
    if (loc.lat > 10 && loc.lat < 22 && loc.lng > 105 && loc.lng < 107) return 'Vietnam';
    if (loc.lat > 41 && loc.lat < 43 && loc.lng > 12 && loc.lng < 13) return 'Italy';
    if (loc.lat > 3 && loc.lat < 4 && loc.lng > 101 && loc.lng < 102) return 'Malaysia';
    if (loc.lat > 6 && loc.lat < 7 && loc.lng > -76 && loc.lng < -75) return 'Colombia';
    if (loc.lat > 10 && loc.lat < 11 && loc.lng > -85 && loc.lng < -84) return 'Costa Rica';
    return 'Other';
  }

  zoomToCountry(country) {
    this.showLoadingMessage('Loading locations...');
    
    setTimeout(() => {
      this.hideLoadingMessage();
      const bounds = {
        'Denmark': [[54.5, 8], [57.8, 13.9]],
        'Japan': [[35.5, 139.5], [36, 140]],
        'Vietnam': [[10, 105], [22, 107]],
        'Italy': [[41, 12], [43, 13]],
        'Malaysia': [[3, 101], [4, 102]],
        'Colombia': [[6, -76], [7, -75]],
        'Costa Rica': [[10, -85], [11, -84]]
      };
      
      const locs = this.locations.filter(loc => 
        this.getCountryForLocation(loc) === country && this.matchesCurrentFilter(loc)
      );
      
      this.markerClusterGroup.clearLayers();
      this.markers.forEach(marker => {
        const loc = marker.locationData;
        if (locs.find(l => l.lat === loc.lat && l.lng === loc.lng)) {
          this.markerClusterGroup.addLayer(marker);
        }
      });
      
      this.map.addLayer(this.markerClusterGroup);
      
      if (bounds[country]) {
        this.map.fitBounds(bounds[country], {animate: true, duration: 0.8});
      } else if (locs.length) {
        const group = new L.featureGroup(locs.map(l => L.marker([l.lat, l.lng])));
        this.map.fitBounds(group.getBounds(), {animate: true, duration: 0.8});
      }
      
      this.showMapMessage(`Showing ${locs.length} location${locs.length === 1 ? '' : 's'} in ${country}`, 'success');
      this.updateFilterCount(locs.length);
    }, 200);
  }

  getCountryFlag(countryName) {
    const flags = {
      'Denmark': '🇩🇰',
      'Japan': '🇯🇵', 
      'Vietnam': '🇻🇳',
      'Italy': '🇮🇹',
      'Malaysia': '🇲🇾',
      'Colombia': '🇨🇴',
      'Costa Rica': '🇨🇷'
    };
    return flags[countryName] || '🌍';
  }

  initEquipmentFilter() {
    const filterSelect = document.getElementById('equipment-filter');
    if (!filterSelect) return;
    
    filterSelect.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.applyEquipmentFilter();
    });
  }

  applyEquipmentFilter() {
    this.clearMapMessage();
    this.showLoadingMessage('Applying filter...');
    
    setTimeout(() => {
      this.hideLoadingMessage();
      let filteredLocations = this.locations;
      
      if (this.currentFilter !== 'All Equipment') {
        const equipmentMap = {
          'Pull-up Bars': 'pullup-bar',
          'Dip Bars': 'dip-bars',
          'Parallel Bars': 'parallel-bars',
          'Monkey Bars': 'monkey-bars',
          'Rings': 'rings'
        };
        
        const targetEquipment = equipmentMap[this.currentFilter];
        console.log(`🔍 Filtering for: "${this.currentFilter}" → "${targetEquipment}"`);
        
        if (targetEquipment) {
          filteredLocations = this.locations.filter(loc => {
            const hasEquipment = loc.equipment && loc.equipment.includes(targetEquipment);
            console.log(`📍 ${loc.name}: equipment=${JSON.stringify(loc.equipment)}, has ${targetEquipment}=${hasEquipment}`);
            return hasEquipment;
          });
        }
        
        console.log(`✅ Found ${filteredLocations.length} locations with ${this.currentFilter}`);
      } else {
        console.log(`🔍 Showing all ${this.locations.length} locations`);
      }
      
      this.updateMarkersForFilter(filteredLocations);
      this.showFilterFeedback(filteredLocations.length);
      this.updateFilterCount(filteredLocations.length);
    }, 300);
  }

  updateMarkersForFilter(filteredLocations) {
    this.markerClusterGroup.clearLayers();
    
    this.markers.forEach(marker => {
      const loc = marker.locationData;
      const isVisible = filteredLocations.find(f => 
        f.lat === loc.lat && f.lng === loc.lng
      );
      if (isVisible) {
        this.markerClusterGroup.addLayer(marker);
      }
    });
    
    this.map.addLayer(this.markerClusterGroup);
  }

  showFilterFeedback(count) {
    if (this.currentFilter === 'All Equipment') {
      this.showMapMessage(`Showing all ${count} locations`, 'success');
    } else if (count === 0) {
      this.showMapMessage(`No locations found with ${this.currentFilter}. Try a different filter.`, 'error');
    } else {
      this.showMapMessage(`Showing ${count} location${count === 1 ? '' : 's'} with ${this.currentFilter}`, 'success');
    }
    
    // Auto-hide the message after 4 seconds
    setTimeout(() => {
      this.clearMapMessage();
    }, 4000);
  }

  updateFilterCount(count) {
    const countEl = document.getElementById('filter-count');
    if (countEl) {
      if (this.currentFilter === 'All Equipment') {
        countEl.style.display = 'none';
      } else {
        countEl.textContent = `${count} location${count === 1 ? '' : 's'}`;
        countEl.style.display = 'block';
      }
    }
  }

  matchesCurrentFilter(location) {
    if (this.currentFilter === 'All Equipment') return true;
    
    const equipmentMap = {
      'Pull-up Bars': 'pullup-bar',
      'Dip Bars': 'dip-bars',
      'Parallel Bars': 'parallel-bars',
      'Monkey Bars': 'monkey-bars',
      'Rings': 'rings'
    };
    
    const targetEquipment = equipmentMap[this.currentFilter];
    const hasEquipment = targetEquipment && location.equipment && location.equipment.includes(targetEquipment);
    
    // Debug logging for monkey bars specifically
    if (this.currentFilter === 'Monkey Bars') {
      console.log(`🐒 ${location.name}: equipment=${JSON.stringify(location.equipment)}, looking for "monkey-bars", result=${hasEquipment}`);
    }
    
    return hasEquipment;
  }

  setActiveNavButton(buttonId) {
    // Remove active class from all nav buttons
    document.querySelectorAll('nav a').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    const activeBtn = document.getElementById(buttonId);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  showLocationDetails(location) {
    console.log('Showing details for:', location.name);
    
    // Populate location details modal
    document.getElementById('location-name').textContent = location.name;
    document.getElementById('location-description').textContent = location.description;
    
    // Show/hide verified badge
    const verifiedBadge = document.getElementById('location-verified-badge');
    if (location.verified) {
      verifiedBadge.style.display = 'inline-block';
    } else {
      verifiedBadge.style.display = 'none';
    }
    
    // Populate equipment
    const equipmentContainer = document.getElementById('location-equipment');
    equipmentContainer.innerHTML = '';
    location.equipment.forEach(equipment => {
      const equipmentItem = document.createElement('span');
      equipmentItem.className = 'equipment-item';
      equipmentItem.textContent = equipment.replace('-', ' ');
      equipmentContainer.appendChild(equipmentItem);
    });
    
    // Populate practical info
    document.getElementById('location-surface').textContent = location.surface_type;
    document.getElementById('location-accessibility').textContent = location.accessibility;
    document.getElementById('location-lighting').textContent = location.night_lighting ? 'Available' : 'Not available';
    document.getElementById('location-parking').textContent = location.parking_nearby ? 'Available' : 'Not available';
    
    // Populate timing info
    document.getElementById('location-best-time').textContent = this.formatBestTime(location.best_time);
    document.getElementById('location-crowd').textContent = this.formatCrowdLevel(location.crowd_level);
    
    // Populate facilities
    const facilitiesContainer = document.getElementById('location-facilities');
    facilitiesContainer.innerHTML = '';
    if (location.facilities_nearby === 'none') {
      const facilityItem = document.createElement('span');
      facilityItem.className = 'facility-item none';
      facilityItem.textContent = 'No facilities nearby';
      facilitiesContainer.appendChild(facilityItem);
    } else {
      const facilities = location.facilities_nearby.split(', ');
      facilities.forEach(facility => {
        const facilityItem = document.createElement('span');
        facilityItem.className = 'facility-item';
        facilityItem.textContent = facility;
        facilitiesContainer.appendChild(facilityItem);
      });
    }
    
    // Populate warnings
    const warningsSection = document.getElementById('location-warnings-section');
    const warningsContainer = document.getElementById('location-warnings');
    warningsContainer.innerHTML = '';
    
    if (location.warnings && location.warnings.length > 0) {
      warningsSection.style.display = 'block';
      location.warnings.forEach(warning => {
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item';
        warningItem.textContent = warning;
        warningsContainer.appendChild(warningItem);
      });
    } else {
      warningsSection.style.display = 'none';
    }
    
    // Open the modal
    const locationModal = document.getElementById('location-details-modal');
    this.openModal(locationModal);
  }

  formatBestTime(bestTime) {
    const timeMap = {
      'early_morning': 'Early Morning',
      'afternoon': 'Afternoon',
      'evening': 'Evening',
      'anytime': 'Any Time'
    };
    return timeMap[bestTime] || bestTime;
  }

  formatCrowdLevel(crowdLevel) {
    const crowdMap = {
      'usually_empty': 'Usually Empty',
      'moderate': 'Moderate',
      'busy': 'Usually Busy'
    };
    return crowdMap[crowdLevel] || crowdLevel;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  new CaliSpotMap();
}); 