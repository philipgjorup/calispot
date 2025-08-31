class CaliSpotMap {
  constructor() {
    console.log('CaliSpotMap: constructor called');
    this.locations = [];
    this.markers = [];
    this.userMarker = null;
    this.currentFilter = 'All Equipment';
    this.customZoomWorking = false;
    
    // Nostr properties
    this.nostrUser = null;
    this.nostrPool = null;
    this.nostrRelays = ['wss://relay.damus.io', 'wss://nos.lol'];
    
    this.initMap();
    this.initCustomZoom();
    this.initNearMe();
    this.initChooseLocation();
    this.initEquipmentFilter();
    this.initFooterModals();
    this.initGlobalEventListeners();
    this.initCloseTextListeners();
    this.initNostr();
  }

  async initMap() {
    try {
      // Fetch locations data
      const response = await fetch('data/locations.json');
      this.locations = await response.json();
      console.log('Loaded locations:', this.locations.length);

      // Initialize map
      this.map = L.map('map', {
        zoomControl: false, // Disable default zoom controls since we have custom ones
        doubleClickZoom: true,
        scrollWheelZoom: true,
        boxZoom: true,
        keyboard: true
      }).setView([55.6761, 12.5683], 10);
      
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
      
      // Test zoom functionality
      this.testZoomFunctionality();

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  testZoomFunctionality() {
    // Test zoom functionality after map is initialized
    setTimeout(() => {
      console.log('Testing zoom functionality...');
      console.log('Current zoom level:', this.map.getZoom());
      console.log('Min zoom:', this.map.getMinZoom());
      console.log('Max zoom:', this.map.getMaxZoom());
      
      // Test programmatic zoom
      const currentZoom = this.map.getZoom();
      this.map.setZoom(currentZoom + 1);
      console.log('Zoom test: should be', currentZoom + 1, 'actual:', this.map.getZoom());
      
      // Reset zoom
      this.map.setZoom(currentZoom);
      console.log('Zoom functionality test completed');
      
      // Test if zoom controls are properly set up
      this.testZoomControlsSetup();
    }, 1000);
  }

  testZoomControlsSetup() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    if (zoomInBtn && zoomOutBtn) {
      console.log('✅ Zoom buttons found in DOM');
      console.log('Zoom in button:', {
        visible: zoomInBtn.offsetParent !== null,
        clickable: zoomInBtn.style.pointerEvents !== 'none',
        zIndex: window.getComputedStyle(zoomInBtn).zIndex
      });
      console.log('Zoom out button:', {
        visible: zoomOutBtn.offsetParent !== null,
        clickable: zoomOutBtn.style.pointerEvents !== 'none',
        zIndex: window.getComputedStyle(zoomOutBtn).zIndex
      });
    } else {
      console.log('❌ Zoom buttons not found in DOM');
    }
  }

  initCustomZoom() {
    // Wait for map to be initialized before setting up zoom controls
    const setupZoomControls = () => {
      const zoomInBtn = document.getElementById('zoom-in');
      const zoomOutBtn = document.getElementById('zoom-out');
      
      if (zoomInBtn && zoomOutBtn && this.map) {
        console.log('Setting up custom zoom controls');
        
        // Remove any existing listeners to prevent duplicates
        zoomInBtn.replaceWith(zoomInBtn.cloneNode(true));
        zoomOutBtn.replaceWith(zoomOutBtn.cloneNode(true));
        
        // Get fresh references after cloning
        const newZoomInBtn = document.getElementById('zoom-in');
        const newZoomOutBtn = document.getElementById('zoom-out');
        
        newZoomInBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Zoom in clicked');
          if (this.map) {
            this.map.zoomIn();
            console.log('Map zoomed in to level:', this.map.getZoom());
            this.customZoomWorking = true;
          }
        });
        
        newZoomOutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Zoom out clicked');
          if (this.map) {
            this.map.zoomOut();
            console.log('Map zoomed out to level:', this.map.getZoom());
            this.customZoomWorking = true;
          }
        });
        
        // Add keyboard support
        document.addEventListener('keydown', (e) => {
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            if (this.map) this.map.zoomIn();
          } else if (e.key === '-') {
            e.preventDefault();
            if (this.map) this.map.zoomOut();
          }
        });
        
        console.log('Custom zoom controls initialized successfully');
        
        // Ensure zoom controls are visible and properly positioned
        this.ensureZoomControlsVisibility();
      } else {
        console.log('Zoom controls not ready yet, retrying...');
        setTimeout(setupZoomControls, 100);
      }
    };
    
    // Start setup process
    setupZoomControls();
  }

  ensureZoomControlsVisibility() {
    const zoomContainer = document.querySelector('.custom-zoom');
    if (zoomContainer) {
      // Ensure proper z-index and positioning
      zoomContainer.style.zIndex = '1000';
      zoomContainer.style.pointerEvents = 'auto';
      
      // Check if buttons are visible
      const buttons = zoomContainer.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        btn.style.display = 'block';
        btn.style.visibility = 'visible';
        btn.style.opacity = '1';
        console.log(`Zoom button ${index + 1} is visible and clickable`);
      });
    }
    
    // Fallback: If custom controls don't work, enable default Leaflet controls
    setTimeout(() => {
      if (this.map && !this.customZoomWorking) {
        console.log('Enabling fallback Leaflet zoom controls');
        this.map.addControl(L.control.zoom({
          position: 'bottomright'
        }));
      }
    }, 3000);
  }

  initNearMe() {
    const nearMeBtn = document.getElementById('near-me');
    if (!nearMeBtn) return;
    nearMeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleNearMe();
    });
  }

  getLocationsByCountry(country) {
    return this.locations.filter(location => {
      return location.country && location.country.toLowerCase() === country.toLowerCase();
    });
  }

  async getCountryFromCoords(lat, lng) {
    try {
      console.log('Getting country for coordinates:', lat, lng);
      
      // Add delay to respect Nominatim usage policy (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      if (data.address && data.address.country) {
        const country = data.address.country;
        console.log('Detected country:', country);
        return country;
      } else {
        console.log('No country found in response');
        return 'Unknown';
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      return 'Unknown';
    }
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
      async (pos) => {
        this.hideLoadingMessage();
        const userLatLng = [pos.coords.latitude, pos.coords.longitude];
        
        // Get country from coordinates
        this.showLoadingMessage('Detecting your country...');
        const detectedCountry = await this.getCountryFromCoords(userLatLng[0], userLatLng[1]);
        console.log('User location country:', detectedCountry);
        
        // Get locations in the detected country
        const countryLocations = this.getLocationsByCountry(detectedCountry);
        console.log(`Found ${countryLocations.length} locations in ${detectedCountry}`);
        
        this.showUserMarker(userLatLng);
        const nearby = this.getNearbyLocations(userLatLng, 5); // Changed to 5km
        
        if (nearby.length === 0) {
          // Find closest location regardless of distance
          const closest = this.getClosestLocation(userLatLng);
          const closestDistance = this.calculateDistance(userLatLng[0], userLatLng[1], closest.lat, closest.lng);
          this.showMapMessage(`No workout spots within 5km in ${detectedCountry}. Closest location is ${closestDistance.toFixed(1)}km away.`, 'error');
          
          // Show option to view closest locations anyway
          this.showClosestLocationsOption(userLatLng);
        } else {
          // Sort by distance and show nearby locations
          const sortedNearby = nearby.sort((a, b) => {
            const distA = this.calculateDistance(userLatLng[0], userLatLng[1], a.lat, a.lng);
            const distB = this.calculateDistance(userLatLng[0], userLatLng[1], b.lat, b.lng);
            return distA - distB;
          });
          
          this.showNearbyMarkers(sortedNearby);
          this.showNearbyLocationsList(sortedNearby, userLatLng);
          this.showMapMessage(`Found ${sortedNearby.length} workout spot${sortedNearby.length === 1 ? '' : 's'} within 5km in ${detectedCountry}`, 'success');
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

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  getClosestLocation(userLatLng) {
    let closest = null;
    let minDistance = Infinity;
    
    this.locations.forEach(location => {
      const distance = this.calculateDistance(userLatLng[0], userLatLng[1], location.lat, location.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closest = location;
      }
    });
    
    return closest;
  }

  showClosestLocationsOption(userLatLng) {
    // Create a button to show closest locations anyway
    const button = document.createElement('button');
    button.textContent = 'Show closest locations anyway';
    button.className = 'closest-locations-btn';
    button.style.cssText = `
      position: absolute;
      top: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff6b35;
      color: #000;
      border: none;
      border-radius: 6px;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      z-index: 3000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    button.addEventListener('click', () => {
      this.showClosestLocations(userLatLng);
      button.remove();
    });
    
    document.body.appendChild(button);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (button.parentNode) {
        button.remove();
      }
    }, 10000);
  }

  showClosestLocations(userLatLng) {
    // Get closest 5 locations regardless of distance
    const locationsWithDistance = this.locations.map(location => ({
      ...location,
      distance: this.calculateDistance(userLatLng[0], userLatLng[1], location.lat, location.lng)
    }));
    
    const closestLocations = locationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    
    this.showNearbyMarkers(closestLocations);
    this.showNearbyLocationsList(closestLocations, userLatLng);
    this.showMapMessage(`Showing closest ${closestLocations.length} locations (up to ${closestLocations[closestLocations.length - 1].distance.toFixed(1)}km away)`, 'success');
  }

  showNearbyLocationsList(locations, userLatLng) {
    // Remove existing list if any
    const existingList = document.getElementById('nearby-locations-list');
    if (existingList) {
      existingList.remove();
    }
    
    // Create new list
    const listContainer = document.createElement('div');
    listContainer.id = 'nearby-locations-list';
    listContainer.style.cssText = `
      position: absolute;
      top: 80px;
      left: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      border-radius: 8px;
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 2000;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Nearby Workout Spots';
    title.style.cssText = `
      margin: 0 0 12px 0;
      color: #ff6b35;
      font-size: 1rem;
      font-weight: 600;
    `;
    listContainer.appendChild(title);
    
    // Add country information if available
    if (locations.length > 0 && locations[0].country) {
      const countryInfo = document.createElement('div');
      countryInfo.style.cssText = `
        font-size: 0.85rem;
        color: #ccc;
        margin-bottom: 12px;
        padding: 8px;
        background: rgba(255,107,53,0.1);
        border-radius: 4px;
        border-left: 3px solid #ff6b35;
      `;
      countryInfo.textContent = `📍 ${locations[0].country}`;
      listContainer.appendChild(countryInfo);
    }
    
    const list = document.createElement('div');
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    locations.forEach(location => {
      const distance = this.calculateDistance(userLatLng[0], userLatLng[1], location.lat, location.lng);
      const item = document.createElement('div');
      item.style.cssText = `
        background: rgba(255,255,255,0.1);
        padding: 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
        border-left: 3px solid #ff6b35;
      `;
      
      item.innerHTML = `
        <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${location.name}</div>
        <div style="font-size: 0.85rem; color: #ccc;">${distance.toFixed(1)}km away</div>
        <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">${location.equipment.join(', ')}</div>
      `;
      
      item.addEventListener('click', () => {
        this.map.setView([location.lat, location.lng], 16, {animate: true, duration: 0.8});
        this.showLocationDetails(location);
        listContainer.remove();
      });
      
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255,107,53,0.2)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.background = 'rgba(255,255,255,0.1)';
      });
      
      list.appendChild(item);
    });
    
    listContainer.appendChild(list);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    `;
    closeBtn.addEventListener('click', () => {
      listContainer.remove();
    });
    listContainer.appendChild(closeBtn);
    
    document.body.appendChild(listContainer);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (listContainer.parentNode) {
        listContainer.remove();
      }
    }, 30000);
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

  clearNearbyLocationsList() {
    const existingList = document.getElementById('nearby-locations-list');
    if (existingList) {
      existingList.remove();
    }
    
    // Also clear any closest locations buttons
    const closestBtn = document.querySelector('.closest-locations-btn');
    if (closestBtn) {
      closestBtn.remove();
    }
  }

  initChooseLocation() {
    const chooseBtn = document.getElementById('choose-location');
    const modal = document.getElementById('choose-location-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (!chooseBtn || !modal) return;
    
    chooseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.populateCountryLists();
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('open'), 10);
      this.setActiveNavButton('choose-location');
      
      // Test the centered X button functionality
      this.testChooseLocationModalClose();
    });
    
    // Fix close button functionality
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Choose location modal X button clicked');
        this.closeModal(modal);
      });
    }
    
    modal.addEventListener('click', (e) => {
      // Removed click-outside-to-close functionality
      // Users will use the X button or "Click here to close" text instead
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
    
    // Removed touch event handling for click-outside-to-close
    // Users will use the X button or "Click here to close" text instead
    document.addEventListener('touchstart', (e) => {
      // Touch outside detection disabled for better UX
    }, { passive: true });
  }

  initNostr() {
    console.log('Initializing Nostr integration...');
    
    // Check for Nostr extension
    if (typeof window.nostr !== 'undefined') {
      console.log('✅ Nostr extension detected');
      this.setupNostrUI();
    } else {
      console.log('❌ No Nostr extension found');
      this.showNostrExtensionMessage();
    }
  }

  setupNostrUI() {
    const nostrBtn = document.getElementById('nostr-login');
    const logoutBtn = document.getElementById('nostr-logout');
    const userInfo = document.getElementById('nostr-user-info');
    
    if (nostrBtn) {
      nostrBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNostrLogin();
      });
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNostrLogout();
      });
    }
    
    // Check if user is already connected
    this.checkNostrSession();
  }

  showNostrExtensionMessage() {
    const nostrBtn = document.getElementById('nostr-login');
    if (nostrBtn) {
      const iconElement = nostrBtn.querySelector('.nostr-icon');
      const textElement = nostrBtn.querySelector('.nostr-text');
      
      if (iconElement) iconElement.textContent = '⚠️';
      if (textElement) textElement.textContent = 'Need Extension';
      
      nostrBtn.classList.add('error');
      nostrBtn.title = 'Install a Nostr extension like nos2x or Alby to connect';
    }
  }

  async handleNostrLogin() {
    try {
      console.log('Attempting Nostr login...');
      
      if (!window.nostr) {
        this.showNostrExtensionMessage();
        return;
      }
      
      // Request public key from extension
      const publicKey = await window.nostr.getPublicKey();
      console.log('Got public key:', publicKey);
      
      // Store user session
      this.nostrUser = {
        publicKey: publicKey,
        npub: this.publicKeyToNpub(publicKey)
      };
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('nostrUser', JSON.stringify(this.nostrUser));
      
      // Update UI
      this.updateNostrUI();
      
      // Initialize relay connection
      this.initNostrRelays();
      
      console.log('✅ Nostr login successful');
      
    } catch (error) {
      console.error('❌ Nostr login failed:', error);
      this.handleNostrError(error);
    }
  }

  handleNostrLogout() {
    console.log('Logging out from Nostr...');
    
    // Clear user data
    this.nostrUser = null;
    sessionStorage.removeItem('nostrUser');
    
    // Close relay connections
    if (this.nostrPool) {
      this.nostrPool.close();
      this.nostrPool = null;
    }
    
    // Update UI
    this.updateNostrUI();
    
    console.log('✅ Nostr logout successful');
  }

  checkNostrSession() {
    const storedUser = sessionStorage.getItem('nostrUser');
    if (storedUser) {
      try {
        this.nostrUser = JSON.parse(storedUser);
        console.log('Restored Nostr session:', this.nostrUser.npub);
        this.updateNostrUI();
        this.initNostrRelays();
      } catch (error) {
        console.error('Failed to restore Nostr session:', error);
        sessionStorage.removeItem('nostrUser');
      }
    }
  }

  updateNostrUI() {
    const nostrBtn = document.getElementById('nostr-login');
    const userInfo = document.getElementById('nostr-user-info');
    const npubElement = document.getElementById('nostr-npub');
    
    if (this.nostrUser) {
      // User is connected
      const iconElement = nostrBtn.querySelector('.nostr-icon');
      const textElement = nostrBtn.querySelector('.nostr-text');
      
      if (iconElement) iconElement.textContent = '✅';
      if (textElement) textElement.textContent = 'Connected';
      
      nostrBtn.classList.remove('error');
      nostrBtn.classList.add('connected');
      
      if (userInfo && npubElement) {
        npubElement.textContent = this.nostrUser.npub;
        userInfo.classList.add('show');
      }
      
    } else {
      // User is not connected
      const iconElement = nostrBtn.querySelector('.nostr-icon');
      const textElement = nostrBtn.querySelector('.nostr-text');
      
      if (iconElement) iconElement.textContent = '⚡';
      if (textElement) textElement.textContent = 'Connect';
      
      nostrBtn.classList.remove('connected', 'error');
      
      if (userInfo) {
        userInfo.classList.remove('show');
      }
    }
  }

  handleNostrError(error) {
    console.error('Nostr error:', error);
    
    const nostrBtn = document.getElementById('nostr-login');
    if (nostrBtn) {
      const iconElement = nostrBtn.querySelector('.nostr-icon');
      const textElement = nostrBtn.querySelector('.nostr-text');
      
      if (iconElement) iconElement.textContent = '❌';
      if (textElement) textElement.textContent = 'Error';
      
      nostrBtn.classList.add('error');
      nostrBtn.title = `Error: ${error.message}`;
      
      // Reset after 3 seconds
      setTimeout(() => {
        this.updateNostrUI();
      }, 3000);
    }
  }

  publicKeyToNpub(publicKey) {
    // Simple npub encoding (in production, use proper bech32 encoding)
    return `npub1${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 8)}`;
  }

  initNostrRelays() {
    if (!this.nostrUser) return;
    
    try {
      console.log('Connecting to Nostr relays...');
      this.nostrPool = new NostrTools.SimplePool();
      
      // Connect to relays
      this.nostrRelays.forEach(relay => {
        try {
          this.nostrPool.ensureRelay(relay);
          console.log(`✅ Connected to ${relay}`);
        } catch (error) {
          console.error(`❌ Failed to connect to ${relay}:`, error);
        }
      });
      
      console.log('✅ Nostr relay connections initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Nostr relays:', error);
    }
  }

  initCloseTextListeners() {
    // Initialize clickable close text for all modals
    const closeTextLinks = document.querySelectorAll('.close-text-link');
    
    closeTextLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the parent modal
        const modal = link.closest('.modal');
        if (modal) {
          console.log('Close text clicked - closing modal:', modal.id);
          this.closeModal(modal);
        }
      });
      
      // Add visual feedback
      link.addEventListener('mouseenter', () => {
        link.style.transform = 'scale(1.02)';
      });
      
      link.addEventListener('mouseleave', () => {
        link.style.transform = 'scale(1)';
      });
      
      link.addEventListener('touchstart', () => {
        link.style.transform = 'scale(0.98)';
      });
      
      link.addEventListener('touchend', () => {
        setTimeout(() => {
          link.style.transform = 'scale(1)';
        }, 150);
      });
    });
  }

  initFooterModals() {
    // Privacy Notice
    const privacyBtn = document.getElementById('privacy-notice');
    const privacyModal = document.getElementById('privacy-modal');
    const privacyCloseBtn = document.getElementById('privacy-modal-close');
    
    if (privacyBtn && privacyModal) {
      privacyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Privacy button clicked');
        this.openModal(privacyModal);
      });
      privacyModal.addEventListener('click', (e) => {
        // Removed click-outside-to-close functionality
        // Users will use the X button or "Click here to close" text instead
      });
      
      if (privacyCloseBtn) {
        privacyCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Privacy modal X button clicked');
          this.closeModal(privacyModal);
        });
      }
    } else {
      console.error('Privacy modal elements not found:', {privacyBtn, privacyModal});
    }

    // About
    const aboutBtn = document.getElementById('about-calispot');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.getElementById('about-modal-close');
    
    if (aboutBtn && aboutModal) {
      aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('About button clicked');
        this.openModal(aboutModal);
      });
      aboutModal.addEventListener('click', (e) => {
        // Removed click-outside-to-close functionality
        // Users will use the X button or "Click here to close" text instead
      });
      
      if (aboutCloseBtn) {
        aboutCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('About modal X button clicked');
          this.closeModal(aboutModal);
        });
      }
    } else {
      console.error('About modal elements not found:', {aboutBtn, aboutModal});
    }

    // Contact
    const contactBtn = document.getElementById('contact');
    const contactModal = document.getElementById('contact-modal');
    const contactCloseBtn = document.getElementById('contact-modal-close');
    
    if (contactBtn && contactModal) {
      contactBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Contact button clicked');
        this.openModal(contactModal);
      });
      contactModal.addEventListener('click', (e) => {
        // Removed click-outside-to-close functionality
        // Users will use the X button or "Click here to close" text instead
      });
      
      if (contactCloseBtn) {
        contactCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Contact modal X button clicked');
          this.closeModal(contactModal);
        });
      }
    } else {
      console.error('Contact modal elements not found:', {contactBtn, contactModal});
    }

    // Add Location
    const addLocationBtn = document.getElementById('add-location');
    const addLocationModal = document.getElementById('add-location-modal');
    const addLocationCloseBtn = document.getElementById('add-location-modal-close');
    
    if (addLocationBtn && addLocationModal) {
      addLocationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Add location button clicked');
        this.openModal(addLocationModal);
      });
      addLocationModal.addEventListener('click', (e) => {
        // Removed click-outside-to-close functionality
        // Users will use the X button or "Click here to close" text instead
      });
      
      if (addLocationCloseBtn) {
        addLocationCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Add location modal X button clicked');
          this.closeModal(addLocationModal);
        });
      }
    } else {
      console.error('Add location modal elements not found:', {addLocationBtn, addLocationModal});
    }

    // Location Details Modal
    const locationDetailsModal = document.getElementById('location-details-modal');
    if (locationDetailsModal) {
      // Removed click-outside-to-close functionality
      // Users will use the X button or "Click here to close" text instead
      locationDetailsModal.addEventListener('click', (e) => {
        // Click-outside-to-close disabled for better UX
      });
      
      // Add close button functionality
      const closeBtn = document.getElementById('location-modal-close');
      
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Location modal X button clicked');
          this.closeModal(locationDetailsModal);
        });
      }
      
      // Prevent clicks inside modal content from closing the modal
      const modalContent = locationDetailsModal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
      
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
    // Use country field from JSON if available, otherwise fall back to coordinate-based detection
    if (loc.country) {
      return loc.country;
    }
    
    // Fallback: Simple hardcoded mapping by lat/lng for backward compatibility
    if (loc.lat > 54 && loc.lat < 58 && loc.lng > 8 && loc.lng < 20) return 'Denmark';
    if (loc.lat > 35 && loc.lat < 37 && loc.lng > 139 && loc.lng < 141) return 'Japan';
    if (loc.lat > 10 && loc.lat < 22 && loc.lng > 105 && loc.lng < 107) return 'Vietnam';
    if (loc.lat > 41 && loc.lat < 45 && loc.lng > 10 && loc.lng < 14) return 'Italy';
    if (loc.lat > 2 && loc.lat < 4 && loc.lng > 101 && loc.lng < 103) return 'Malaysia';
    if (loc.lat > 4 && loc.lat < 7 && loc.lng > -77 && loc.lng < -74) return 'Colombia';
    if (loc.lat > 9 && loc.lat < 11 && loc.lng > -85 && loc.lng < -83) return 'Costa Rica';
    return 'Other';
  }

  zoomToCountry(country) {
    this.showLoadingMessage('Loading locations...');
    this.clearNearbyLocationsList();
    
    setTimeout(() => {
      this.hideLoadingMessage();
      const bounds = {
        'Denmark': [[54, 8], [58, 20]],
        'Japan': [[35, 139], [37, 141]],
        'Vietnam': [[10, 105], [22, 107]],
        'Italy': [[41, 10], [45, 14]],
        'Malaysia': [[2, 101], [4, 103]],
        'Colombia': [[4, -77], [7, -74]],
        'Costa Rica': [[9, -85], [11, -83]]
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
    this.clearNearbyLocationsList();
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
    
    // Handle photo display
    this.handleLocationPhoto(location.photos);
    
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
    
    // Debug: Test close functionality
    this.testModalCloseFunctionality(locationModal);
  }

  testModalCloseFunctionality(modal) {
    setTimeout(() => {
      console.log('Testing modal close functionality...');
      
      // Test if close button exists
      const closeBtn = document.getElementById('location-modal-close');
      
      console.log('X close button found:', !!closeBtn);
      
      // Test if modal content prevents event bubbling
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        console.log('Modal content found, event bubbling should be prevented');
      }
      
      // Test ESC key
      console.log('Press ESC key to test keyboard close functionality');
      
      // Test click outside
      console.log('Click the "Click here to close" text at the bottom to close');
      
      // Test X button
      console.log('Tap the × button in the top-right corner to close');
    }, 500);
  }

  testChooseLocationModalClose() {
    setTimeout(() => {
      console.log('Testing Choose Location modal close functionality...');
      
      // Test if close button exists
      const closeBtn = document.getElementById('modal-close-btn');
      
      console.log('Choose Location X close button found:', !!closeBtn);
      
      if (closeBtn) {
        const rect = closeBtn.getBoundingClientRect();
        console.log('Choose Location X button position:', {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        
        // Check if it's centered
        const modalContent = document.querySelector('#choose-location-modal .modal-content');
        if (modalContent) {
          const modalRect = modalContent.getBoundingClientRect();
          const buttonCenter = rect.left + rect.width / 2;
          const modalCenter = modalRect.left + modalRect.width / 2;
          const isCentered = Math.abs(buttonCenter - modalCenter) < 5; // 5px tolerance
          console.log('X button is centered:', isCentered);
        }
      }
      
      // Test ESC key
      console.log('Press ESC key to test keyboard close functionality');
      
      // Test click outside
      console.log('Click the "Click here to close" text at the bottom to close');
      
      // Test X button
      console.log('Tap the × button in the center-top to close');
    }, 500);
  }

  handleLocationPhoto(photos) {
    const photoSection = document.getElementById('location-photo-section');
    const photoImg = document.getElementById('location-photo');
    
    // Hide photo section by default
    photoSection.style.display = 'none';
    
    // Check if location has photos
    if (!photos || photos.length === 0) {
      console.log('No photos available for this location');
      return;
    }
    
    const photoUrl = photos[0]; // Use first photo
    console.log('Loading photo:', photoUrl);
    
    // Show photo section and add loading state
    photoSection.style.display = 'block';
    photoSection.classList.add('loading');
    photoImg.classList.add('loading');
    
    // Create new image to test loading
    const testImg = new Image();
    
    // Set timeout for photo loading (10 seconds)
    const loadingTimeout = setTimeout(() => {
      console.log('Photo loading timeout');
      photoSection.style.display = 'none';
      photoSection.classList.remove('loading');
      photoImg.classList.remove('loading');
    }, 10000);
    
    testImg.onload = () => {
      console.log('Photo loaded successfully');
      clearTimeout(loadingTimeout);
      photoImg.src = photoUrl;
      photoImg.classList.remove('loading');
      photoSection.classList.remove('loading');
    };
    
    testImg.onerror = () => {
      console.log('Photo failed to load');
      clearTimeout(loadingTimeout);
      photoSection.style.display = 'none';
      photoSection.classList.remove('loading');
      photoImg.classList.remove('loading');
    };
    
    // Start loading the image
    testImg.src = photoUrl;
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
  console.log('Initializing CaliSpotMap...');
  
  // Debug: Check if zoom buttons exist in DOM
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  console.log('Zoom buttons found:', { zoomIn: !!zoomInBtn, zoomOut: !!zoomOutBtn });
  
  if (zoomInBtn && zoomOutBtn) {
    console.log('Zoom button positions:', {
      zoomIn: zoomInBtn.getBoundingClientRect(),
      zoomOut: zoomOutBtn.getBoundingClientRect()
    });
  }
  
  new CaliSpotMap();
}); 