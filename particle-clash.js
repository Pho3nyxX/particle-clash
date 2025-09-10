// initial setup
let canvas = document.querySelector('canvas');
let context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// variables
let mouse = {
    x: innerWidth / 2,
    y: innerHeight / 2
}

let colorArray = [
    "#8ecae6",
    "#219ebc",
    "#023047",
    "#ffb703",
    "#fb8500"
]

let bigParticle;
let smallParticle;
let particles = [];
let gravity = 0.05;
let friction = 0.99;

// event listeners
// resize canvas if browser window changes
window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
})

// utility functions
// generate random integer
function generateRandomIntFromRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// randomly select a color from an array of color
function randomColor(colorArray) {
    return colorArray[Math.floor(Math.random() * colorArray.length)];
}

// distance between two points - to see if circles are colliding
function distance(x1, y1, x2, y2) {
    let xDistance = x2 - x1;
    let yDistance = y2 - y1;

    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2))
}

/**
 * create and animate a particle to be used in explosion effects.
 */
class ParticleExplosion {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.opacity = 1;
    }

    draw() {
        context.save();
        context.globalAlpha = this.opacity;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
        context.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.velocity.y += gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.opacity -= 0.005;
    }
}

// objects
/**
 * Defines a base particle that moves in a circular path and draws a trailing line from its previous position.
 * @param {*} x 
 * @param {*} y 
 * @param {*} radius 
 * @param {*} color 
 */
function Particle(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.radians = Math.random() * Math.PI * 2;
    this.velocity = 0.05;

    this.draw = lastPoint => {
        context.beginPath();
        context.strokeStyle = this.color;
        context.lineWidth = this.radius;
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(this.x, this.y);
        context.stroke();
        context.closePath();
    }

    this.update = () => {

        let lastPoint = {
            x: this.x,
            y: this.y
        }

        // move point over time
        this.radians += this.velocity;

        // circular motion
        this.x = x + Math.cos(this.radians) * this.distanceFromCenter;
        this.y = y + Math.sin(this.radians) * this.distanceFromCenter;;

        this.draw(lastPoint);
    }
}

/**
 * Create a small particle object that moves within the canvas, bouncing off edges when it hits boundaries.
 * @param {*} x 
 * @param {*} y 
 * @param {*} radius 
 * @param {*} color 
 */
function SmallParticle(x, y, radius, color) {
    Particle.call(this, x, y, radius, color);

    this.velocity = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
    }

    this.draw = () => {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
    }

    this.update = () => {
        // remove the small particle if no big particles left 
        if (bigParticle.length === 0) {
            smallParticle.splice(smallParticle.indexOf(this), 1);
            // stop update after removal
            return;
        }

        // prevent particles from going offscreen horizontally
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
            this.velocity.x = -this.velocity.x;
        }

        // prevent particles from going offscreen vertically
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
            this.velocity.y = -this.velocity.y;
        }

        // update position
        // move each particle (circle) across the canvas
        this.x += this.velocity.x;
        this.y += this.velocity.y

        this.draw();
    }
}

/**
 * Create a big particle in the canvas center and triggers an explosion when a small particle collides with it.
 * @param {*} x 
 * @param {*} y 
 * @param {*} radius 
 * @param {*} color 
 */
function BigParticle(x, y, radius, color) {
    Particle.call(this, x, y, radius, color);
    this.distanceFromCenter = generateRandomIntFromRange(0, 120);

    this.update = () => {
        let lastPoint = {
            x: this.x,
            y: this.y
        };

        // move over time
        this.radians += this.velocity;

        this.x = canvas.width / 2 + Math.cos(this.radians) * this.distanceFromCenter;
        this.y = canvas.height / 2 + Math.sin(this.radians) * this.distanceFromCenter;

        // check collision with all small particles
        for (let i = 0; i < smallParticle.length; i++) {
            let newSmallParticle = smallParticle[i];

            if (distance(this.x, this.y, newSmallParticle.x, newSmallParticle.y) < this.radius + newSmallParticle.radius) {

                // explode immediately
                explode(this.x, this.y, this.color, this.radius);

                // garbage collection - remove particles that goes offscreen
                bigParticle.splice(bigParticle.indexOf(this), 1);

                // stop update to prevent errors after removal
                return;
            }
        }
        this.draw(lastPoint);
    }
}

/**
 * Trigger explosion effect by generating particle fragments.
 * @param {*} x 
 * @param {*} y 
 * @param {*} color 
 */
function explode(x, y, color, radius) {
    let particleCount = 10;
    let angleIncrement = Math.PI * 2 / particleCount;
    let shootingPower = 8;

    for (let i = 0; i < particleCount; i++) {
        particles.push(
            new ParticleExplosion(
                x,
                y,
                3,
                randomColor(colorArray),
                {
                    x: Math.cos(angleIncrement * i) * Math.random() * shootingPower,
                    y: Math.sin(angleIncrement * i) * Math.random() * shootingPower
                }
            )
        );
    }
}

// implementation
/**
 * Initializes particles by resetting arrays and creating new particles.
 */
function init() {
    smallParticle = [];
    bigParticle = [];

    let radius = 20;
    // ensure particle is visible when spawned
    let x = generateRandomIntFromRange(radius, canvas.width - radius);
    let y = generateRandomIntFromRange(radius, canvas.height - radius);

    // create one bouncing small particle within canvas bounds.
    smallParticle.push(new SmallParticle(x, y, radius, '#fb8500'));

    // spawns 100 big particles around the canvas center
    for (let j = 0; j < 100; j++) {
        let radius = (Math.random() * 2) + 1;

        bigParticle.push(new BigParticle(canvas.width / 2, canvas.height / 2, radius, randomColor(colorArray)));
    }
}

// animation loop
/**
 * Continuously updates and redraws all particles with a fading trail effect to create smooth animation.
 */
function animate() {
    requestAnimationFrame(animate);
    context.fillStyle = 'rgba(0, 0, 0, 0.1)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    [...smallParticle, ...bigParticle].forEach(particle => {
        particle.update()
    });

    particles.forEach((particle, i) => {
        if (particle.opacity > 0) {
            particle.update();
        } else {
            particles.splice(i, 1);
        }
    });
}

init();
animate();