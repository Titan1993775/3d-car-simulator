// Global variables
let scene, camera, renderer;
let car, road;
let speed = 0;
let maxSpeed = 120;
let acceleration = 0.1;
let deceleration = 0.05;
let brakeStrength = 0.2;
let speedDisplay = document.getElementById('speed');
let gearDisplay = document.getElementById('current-gear');
let turning = 0;

// Key states
const keyStates = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
    space: false
};

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, -5); // Position camera behind the car

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    scene.add(directionalLight);

    // Create ground
    createGround();

    // Create road
    createRoad();

    // Create car
    createCar();

    // Add event listeners for controls
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    // Start animation loop
    animate();
}

// Create the ground
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cfc00,  // Grass green
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create a simple road
function createRoad() {
    road = new THREE.Group();
    
    // Straight road segment
    const roadGeometry = new THREE.PlaneGeometry(10, 100);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,  // Dark gray
        side: THREE.DoubleSide
    });
    const straightRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    straightRoad.rotation.x = -Math.PI / 2;
    straightRoad.position.z = 25;
    
    // Add road markings
    const lineGeometry = new THREE.PlaneGeometry(0.3, 3);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    for (let i = -45; i <= 45; i += 10) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, i); // Slightly above road to prevent z-fighting
        straightRoad.add(line);
    }
    
    road.add(straightRoad);
    
    // Curved road segment (simple right turn)
    const curveRadius = 20;
    const curveSegments = 20;
    const curveAngle = Math.PI / 2; // 90-degree turn
    
    for (let i = 0; i < curveSegments; i++) {
        const angle = (i / curveSegments) * curveAngle;
        const nextAngle = ((i + 1) / curveSegments) * curveAngle;
        
        const x1 = curveRadius * Math.sin(angle);
        const z1 = 75 + curveRadius * Math.cos(angle);
        const x2 = curveRadius * Math.sin(nextAngle);
        const z2 = 75 + curveRadius * Math.cos(nextAngle);
        
        // Calculate center point and rotation for this segment
        const centerX = (x1 + x2) / 2;
        const centerZ = (z1 + z2) / 2;
        const segmentRotation = angle + Math.PI / 2;
        
        // Calculate segment length
        const segmentLength = curveRadius * (curveAngle / curveSegments);
        
        const curveSegmentGeometry = new THREE.PlaneGeometry(10, segmentLength);
        const curveSegment = new THREE.Mesh(curveSegmentGeometry, roadMaterial);
        curveSegment.rotation.x = -Math.PI / 2;
        curveSegment.rotation.z = segmentRotation;
        curveSegment.position.set(centerX, 0, centerZ);
        
        road.add(curveSegment);
    }
    
    // Add another straight segment after the curve
    const secondStraightRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    secondStraightRoad.rotation.x = -Math.PI / 2;
    secondStraightRoad.rotation.z = Math.PI / 2;
    secondStraightRoad.position.set(45, 0, 75);
    
    // Add road markings to second straight road
    for (let i = -45; i <= 45; i += 10) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, 0.01, 0); // Slightly above road
        secondStraightRoad.add(line);
    }
    
    road.add(secondStraightRoad);
    scene.add(road);
}

// Create car model
function createCar() {
    car = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red car
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    car.add(body);
    
    // Car cabin
    const cabinGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 0.95, -0.2);
    car.add(cabin);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    // Front-left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.position.set(-0.8, 0.4, 1);
    car.add(wheelFL);
    
    // Front-right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.position.set(0.8, 0.4, 1);
    car.add(wheelFR);
    
    // Back-left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.rotation.z = Math.PI / 2;
    wheelBL.position.set(-0.8, 0.4, -1);
    car.add(wheelBL);
    
    // Back-right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.rotation.z = Math.PI / 2;
    wheelBR.position.set(0.8, 0.4, -1);
    car.add(wheelBR);
    
    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc });
    
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-0.5, 0.5, 1.5);
    car.add(headlightL);
    
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(0.5, 0.5, 1.5);
    car.add(headlightR);
    
    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
    
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightL.position.set(-0.5, 0.5, -1.5);
    car.add(taillightL);
    
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightR.position.set(0.5, 0.5, -1.5);
    car.add(taillightR);
    
    // Initial position
    car.position.set(0, 0, 0);
    scene.add(car);
}

// Handle key down events
function handleKeyDown(event) {
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
            keyStates.forward = true;
            break;
        case 'ArrowDown':
        case 's':
            keyStates.backward = true;
            break;
        case 'ArrowLeft':
        case 'a':
            keyStates.left = true;
            break;
        case 'ArrowRight':
        case 'd':
            keyStates.right = true;
            break;
        case 'Shift':
            keyStates.shift = true;
            break;
        case ' ': // Space
            keyStates.space = true;
            break;
    }
}

// Handle key up events
function handleKeyUp(event) {
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
            keyStates.forward = false;
            break;
        case 'ArrowDown':
        case 's':
            keyStates.backward = false;
            break;
        case 'ArrowLeft':
        case 'a':
            keyStates.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            keyStates.right = false;
            break;
        case 'Shift':
            keyStates.shift = false;
            break;
        case ' ': // Space
            keyStates.space = false;
            break;
    }
}

// Handle window resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update car movement
function updateCar() {
    // Handle acceleration and braking
    if (keyStates.forward) {
        if (keyStates.shift) {
            speed += acceleration * 1.5; // Boost when Shift is pressed
        } else {
            speed += acceleration;
        }
    } else if (keyStates.backward) {
        speed -= acceleration * 0.7; // Reverse is slower
    } else if (speed > 0) {
        speed -= deceleration; // Natural deceleration when no key is pressed
    } else if (speed < 0) {
        speed += deceleration;
    }
    
    // Apply brakes
    if (keyStates.space) {
        if (speed > 0) {
            speed -= brakeStrength;
        } else if (speed < 0) {
            speed += brakeStrength;
        }
    }
    
    // Clamp speed
    speed = Math.max(-maxSpeed/2, Math.min(maxSpeed, speed)); // Reverse is limited to half max speed
    
    // Round speed for display
    const displaySpeed = Math.abs(Math.round(speed));
    speedDisplay.textContent = displaySpeed;
    
    // Handle gear display
    if (speed > 1) {
        gearDisplay.textContent = 'D';
    } else if (speed < -1) {
        gearDisplay.textContent = 'R';
    } else {
        gearDisplay.textContent = 'N';
    }
    
    // Handle turning
    if (keyStates.left) {
        turning = Math.min(turning + 0.01, 0.03);
    } else if (keyStates.right) {
        turning = Math.max(turning - 0.01, -0.03);
    } else {
        turning *= 0.9; // Return to straight gradually
    }
    
    // Rotate car based on turning
    car.rotation.y += turning * (Math.abs(speed) / 10);
    
    // Move car forward/backward based on speed and rotation
    car.position.x += Math.sin(car.rotation.y) * speed * 0.1;
    car.position.z += Math.cos(car.rotation.y) * speed * 0.1;
    
    // Position camera behind car
    const cameraOffset = new THREE.Vector3(0, 2, -6);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    camera.position.x = car.position.x + cameraOffset.x;
    camera.position.y = car.position.y + cameraOffset.y;
    camera.position.z = car.position.z + cameraOffset.z;
    
    // Look at the car
    camera.lookAt(new THREE.Vector3(
        car.position.x, 
        car.position.y + 1, 
        car.position.z
    ));
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateCar();
    renderer.render(scene, camera);
}

// Start the game
window.onload = init;