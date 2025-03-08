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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Create ground
    createGround();

    // Create road
    createRoad();

    // Create buildings
    createBuildings();

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
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
    const groundTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(25, 25);
    groundTexture.anisotropy = 16;
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        side: THREE.DoubleSide,
        roughness: 0.8
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create a better road
function createRoad() {
    road = new THREE.Group();
    
    // Load textures for road
    const roadBaseTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    const roadAsphaltTexture = createRoadTexture();
    
    roadAsphaltTexture.wrapS = roadAsphaltTexture.wrapT = THREE.RepeatWrapping;
    roadAsphaltTexture.repeat.set(1, 10);
    roadAsphaltTexture.anisotropy = 16;
    
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        map: roadAsphaltTexture,
        roughness: 0.6,
        side: THREE.DoubleSide
    });
    
    // Create road segments using a more advanced approach
    createMainRoad(roadMaterial);
    
    scene.add(road);
}

// Create road texture using canvas
function createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Fill with dark asphalt color
    context.fillStyle = '#333333';
    context.fillRect(0, 0, 512, 512);
    
    // Add some asphalt noise/texture
    context.fillStyle = '#2d2d2d';
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 2 + 0.5;
        context.fillRect(x, y, size, size);
    }
    
    // Add road markings
    context.fillStyle = '#ffffff';
    context.fillRect(246, 0, 20, 512); // Center dividing line
    
    // Dashed side lines
    for (let i = 0; i < 512; i += 40) {
        context.fillRect(40, i, 10, 20);  // Left side
        context.fillRect(462, i, 10, 20); // Right side
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create main road with better geometry
function createMainRoad(roadMaterial) {
    // Create a curved path for the road
    const curve = new THREE.CurvePath();
    
    // First straight segment
    let startPoint = new THREE.Vector3(0, 0, -50);
    let endPoint = new THREE.Vector3(0, 0, 100);
    curve.add(new THREE.LineCurve3(startPoint, endPoint));
    
    // Curve to the right
    const curveStartPoint = endPoint.clone();
    const curveControlPoint1 = new THREE.Vector3(0, 0, 150);
    const curveControlPoint2 = new THREE.Vector3(50, 0, 150);
    const curveEndPoint = new THREE.Vector3(100, 0, 100);
    
    const curvePart = new THREE.CubicBezierCurve3(
        curveStartPoint,
        curveControlPoint1,
        curveControlPoint2,
        curveEndPoint
    );
    curve.add(curvePart);
    
    // Second straight segment
    startPoint = curveEndPoint.clone();
    endPoint = new THREE.Vector3(150, 0, 100);
    curve.add(new THREE.LineCurve3(startPoint, endPoint));
    
    // Create the road mesh from the path
    const roadWidth = 15;
    const roadSegments = 100;
    const frames = curve.computeFrenetFrames(roadSegments, false);
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    
    for (let i = 0; i <= roadSegments; i++) {
        const t = i / roadSegments;
        const point = curve.getPoint(t);
        const normal = frames.normals[i];
        const binormal = frames.binormals[i];
        
        // Calculate points on either side of the road
        const leftPoint = new THREE.Vector3().copy(point).add(
            new THREE.Vector3().copy(binormal).multiplyScalar(roadWidth / 2)
        );
        const rightPoint = new THREE.Vector3().copy(point).add(
            new THREE.Vector3().copy(binormal).multiplyScalar(-roadWidth / 2)
        );
        
        vertices.push(leftPoint.x, leftPoint.y, leftPoint.z);
        vertices.push(rightPoint.x, rightPoint.y, rightPoint.z);
        
        uvs.push(0, t * 10);
        uvs.push(1, t * 10);
    }
    
    // Build the indices for the faces
    const indices = [];
    for (let i = 0; i < roadSegments; i++) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    const roadMesh = new THREE.Mesh(geometry, roadMaterial);
    roadMesh.receiveShadow = true;
    road.add(roadMesh);
    
    // Add sidewalks
    addSidewalks(curve, roadWidth);
}

// Add sidewalks to the road
function addSidewalks(curve, roadWidth) {
    const segments = 100;
    const sidewalkWidth = 3;
    const sidewalkHeight = 0.2;
    
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
        color: 0xbbbbbb,
        roughness: 0.9
    });
    
    const frames = curve.computeFrenetFrames(segments, false);
    
    for (let side = -1; side <= 1; side += 2) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = curve.getPoint(t);
            const binormal = frames.binormals[i];
            
            // Inner edge of sidewalk (next to road)
            const innerOffset = (roadWidth / 2 + 0.1) * side;
            const innerPoint = new THREE.Vector3().copy(point).add(
                new THREE.Vector3().copy(binormal).multiplyScalar(innerOffset)
            );
            
            // Outer edge of sidewalk
            const outerOffset = (roadWidth / 2 + sidewalkWidth) * side;
            const outerPoint = new THREE.Vector3().copy(point).add(
                new THREE.Vector3().copy(binormal).multiplyScalar(outerOffset)
            );
            
            // Add points for the top of the sidewalk
            vertices.push(innerPoint.x, innerPoint.y + sidewalkHeight, innerPoint.z);
            vertices.push(outerPoint.x, outerPoint.y + sidewalkHeight, outerPoint.z);
            
            // Add points for the side of the sidewalk
            if (i < segments) {
                const nextT = (i + 1) / segments;
                const nextPoint = curve.getPoint(nextT);
                const nextBinormal = frames.binormals[i + 1];
                
                const nextInnerOffset = (roadWidth / 2 + 0.1) * side;
                const nextInnerPoint = new THREE.Vector3().copy(nextPoint).add(
                    new THREE.Vector3().copy(nextBinormal).multiplyScalar(nextInnerOffset)
                );
                
                vertices.push(innerPoint.x, innerPoint.y, innerPoint.z);
                vertices.push(innerPoint.x, innerPoint.y + sidewalkHeight, innerPoint.z);
                vertices.push(nextInnerPoint.x, nextInnerPoint.y, nextInnerPoint.z);
                vertices.push(nextInnerPoint.x, nextInnerPoint.y + sidewalkHeight, nextInnerPoint.z);
            }
        }
        
        // Build indices for the top surface
        const indices = [];
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
        }
        
        // Add indices for the sides (if needed)
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const sidewalk = new THREE.Mesh(geometry, sidewalkMaterial);
        sidewalk.castShadow = true;
        sidewalk.receiveShadow = true;
        road.add(sidewalk);
    }
}

// Create simple buildings
function createBuildings() {
    // Define building positions along the road
    const buildingPositions = [
        { x: -30, z: 0, width: 15, depth: 15, height: 40, color: 0xccccdd },
        { x: -25, z: 30, width: 20, depth: 20, height: 35, color: 0xddcccc },
        { x: 30, z: -20, width: 25, depth: 15, height: 25, color: 0xccddcc },
        { x: 30, z: 20, width: 18, depth: 18, height: 30, color: 0xddddcc },
        { x: -40, z: -40, width: 30, depth: 20, height: 20, color: 0xccdddd },
        { x: 60, z: 90, width: 25, depth: 25, height: 45, color: 0xddccdd },
        { x: 100, z: 130, width: 20, depth: 20, height: 35, color: 0xccccdd },
        { x: 140, z: 80, width: 30, depth: 15, height: 25, color: 0xddcccc }
    ];
    
    buildingPositions.forEach(buildingData => {
        createBuilding(
            buildingData.x, 
            buildingData.z, 
            buildingData.width, 
            buildingData.depth, 
            buildingData.height, 
            buildingData.color
        );
    });
}

// Create a single building
function createBuilding(x, z, width, depth, height, color) {
    // Main building body
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    
    // Add windows
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        emissive: 0x113344,
        roughness: 0.2
    });
    
    // Window dimensions
    const windowWidth = 2;
    const windowHeight = 3;
    const windowDepth = 0.1;
    
    // Calculate number of windows based on building size
    const windowsPerFloor = Math.min(Math.floor(width / 4), 5);
    const floors = Math.min(Math.floor(height / 5), 8);
    
    // Window spacing
    const xSpacing = width / (windowsPerFloor + 1);
    const ySpacing = height / (floors + 1);
    
    // Add windows to front and back
    for (let floor = 1; floor <= floors; floor++) {
        const yPos = (floor * ySpacing) - (height / 2);
        
        for (let w = 1; w <= windowsPerFloor; w++) {
            const xPos = (w * xSpacing) - (width / 2);
            
            // Front windows
            const frontWindow = new THREE.Mesh(
                new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth),
                windowMaterial
            );
            frontWindow.position.set(xPos, yPos, depth/2 + 0.1);
            building.add(frontWindow);
            
            // Back windows
            const backWindow = new THREE.Mesh(
                new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth),
                windowMaterial
            );
            backWindow.position.set(xPos, yPos, -depth/2 - 0.1);
            backWindow.rotation.y = Math.PI;
            building.add(backWindow);
        }
    }
    
    // Add windows to sides if building is wide enough
    if (depth >= 8) {
        const sideWindowsPerFloor = Math.min(Math.floor(depth / 4), 4);
        const sideXSpacing = depth / (sideWindowsPerFloor + 1);
        
        for (let floor = 1; floor <= floors; floor++) {
            const yPos = (floor * ySpacing) - (height / 2);
            
            for (let w = 1; w <= sideWindowsPerFloor; w++) {
                const zPos = (w * sideXSpacing) - (depth / 2);
                
                // Left side windows
                const leftWindow = new THREE.Mesh(
                    new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth),
                    windowMaterial
                );
                leftWindow.position.set(-width/2 - 0.1, yPos, zPos);
                building.add(leftWindow);
                
                // Right side windows
                const rightWindow = new THREE.Mesh(
                    new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth),
                    windowMaterial
                );
                rightWindow.position.set(width/2 + 0.1, yPos, zPos);
                building.add(rightWindow);
            }
        }
    }
    
    // Add a roof
    const roofGeometry = new THREE.BoxGeometry(width + 1, 1, depth + 1);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.9
    });
    
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, height/2 + 0.5, 0);
    building.add(roof);
    
    return building;
}

// Create car model
function createCar() {
    car = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.6,
        roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);
    
    // Car cabin
    const cabinGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.2,
        roughness: 0.1
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 0.95, -0.2);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    car.add(cabin);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.9
    });
    
    // Front-left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.position.set(-0.8, 0.4, 1);
    wheelFL.castShadow = true;
    car.add(wheelFL);
    
    // Front-right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.position.set(0.8, 0.4, 1);
    wheelFR.castShadow = true;
    car.add(wheelFR);
    
    // Back-left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.rotation.z = Math.PI / 2;
    wheelBL.position.set(-0.8, 0.4, -1);
    wheelBL.castShadow = true;
    car.add(wheelBL);
    
    // Back-right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.rotation.z = Math.PI / 2;
    wheelBR.position.set(0.8, 0.4, -1);
    wheelBR.castShadow = true;
    car.add(wheelBR);
    
    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffcc, 
        emissive: 0xffffcc,
        emissiveIntensity: 0.5
    });
    
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-0.5, 0.5, 1.5);
    car.add(headlightL);
    
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(0.5, 0.5, 1.5);
    car.add(headlightR);
    
    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
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
    const cameraOffset = new THREE.Vector3(0, 3, -8);
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