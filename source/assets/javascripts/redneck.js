(function () {
  // define variables
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var player = {};
  var ground = [], enemies = [];

  // platform variables
  var platformHeight, platformLength, gapLength;
  var platformWidth = 52;
  var platformBase = canvas.height - platformWidth;  // bottom row of the game
  var platformSpacer = 104;

  /**
   * Get a random number between range
   * @param {integer}
   * @param {integer}
   */
  function rand(low, high) {
    return Math.floor( Math.random() * (high - low + 1) + low );
  }

  /**
   * Bound a number between range
   * @param {integer} num - Number to bound
   * @param {integer}
   * @param {integer}
   */
  function bound(num, low, high) {
    return Math.max( Math.min(num, high), low);
  }

  /**
   * Asset pre-loader object. Loads all images
   */
  var assetLoader = (function() {
    // images dictionary
    this.imgs        = {
      'bg'            : '../assets/images/bg.png',
      'grass'         : '../assets/images/grass.png',
      'avatar_normal' : '../assets/images/redneck-run.png'
    };

    var assetsLoaded = 0;                                // how many assets have been loaded
    var numImgs      = Object.keys(this.imgs).length;    // total number of image assets
    this.totalAssest = numImgs;                          // total number of assets

    /**
     * Ensure all assets are loaded before using them
     * @param {number} dic  - Dictionary name ('imgs', 'sounds', 'fonts')
     * @param {number} name - Asset name in the dictionary
     */
    function assetLoaded(dic, name) {
      // don't count assets that have already loaded
      if (this[dic][name].status !== 'loading') {
        return;
      }

      this[dic][name].status = 'loaded';
      assetsLoaded++;

      // finished callback
      if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {
        this.finished();
      }
    }

    /**
     * Create assets, set callback for asset loading, set asset source
     */
    this.downloadAll = function() {
      var _this = this;
      var src;

      // load images
      for (var img in this.imgs) {
        if (this.imgs.hasOwnProperty(img)) {
          src = this.imgs[img];

          // create a closure for event binding
          (function(_this, img) {
            _this.imgs[img] = new Image();
            _this.imgs[img].status = 'loading';
            _this.imgs[img].name = img;
            _this.imgs[img].onload = function() { assetLoaded.call(_this, 'imgs', img) };
            _this.imgs[img].src = src;
          })(_this, img);
        }
      }
    }

    return {
      imgs: this.imgs,
      totalAssest: this.totalAssest,
      downloadAll: this.downloadAll
    };
  })();

  assetLoader.finished = function() {
    startGame();
  }

  /**
   * Creates a Spritesheet
   * @param {string} - Path to the image.
   * @param {number} - Width (in px) of each frame.
   * @param {number} - Height (in px) of each frame.
   */
  function SpriteSheet(path, frameWidth, frameHeight) {
    this.image = new Image();
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    // calculate the number of frames in a row after the image loads
    var self = this;
    this.image.onload = function() {
      self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
    };

    this.image.src = path;
  }

  /**
   * Creates an animation from a spritesheet.
   * @param {SpriteSheet} - The spritesheet used to create the animation.
   * @param {number}      - Number of frames to wait for before transitioning the animation.
   * @param {array}       - Range or sequence of frame numbers for the animation.
   * @param {boolean}     - Repeat the animation once completed.
   */
  function Animation(spritesheet, frameSpeed, startFrame, endFrame) {

    var animationSequence = [];  // array holding the order of the animation
    var currentFrame = 0;        // the current frame to draw
    var counter = 0;             // keep track of frame rate

    // start and end range for frames
    for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++)
      animationSequence.push(frameNumber);

    /**
     * Update the animation
     */
    this.update = function() {

      // update to the next frame if it is time
      if (counter == (frameSpeed - 1))
        currentFrame = (currentFrame + 1) % animationSequence.length;

      // update the counter
      counter = (counter + 1) % frameSpeed;
    };

    /**
     * Draw the current frame
     * @param {integer} x - X position to draw
     * @param {integer} y - Y position to draw
     */
    this.draw = function(x, y) {
      // get the row and col of the frame
      var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
      var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

      ctx.drawImage(
        spritesheet.image,
        col * spritesheet.frameWidth, row * spritesheet.frameHeight,
        spritesheet.frameWidth, spritesheet.frameHeight,
        x, y,
        spritesheet.frameWidth, spritesheet.frameHeight);
    };
  }

  /**
   * Create a parallax background
   */
  var background = (function() {

    /**
     * Draw the backgrounds to the screen at different speeds
     */
    this.draw = function() {
      ctx.drawImage(assetLoader.imgs.bg, 0, 0);
    };

    /**
     * Reset background to zero
     */
    this.reset = function()  {
    }

    return {
      draw: this.draw,
      reset: this.reset
    };
  })();

  /**
   * A vector for 2d space.
   * @param {integer} x - Center x coordinate.
   * @param {integer} y - Center y coordinate.
   * @param {integer} dx - Change in x.
   * @param {integer} dy - Change in y.
   */
  function Vector(x, y, dx, dy) {
    // position
    this.x = x || 0;
    this.y = y || 0;
    // direction
    this.dx = dx || 0;
    this.dy = dy || 0;
  }

  /**
   * Advance the vectors position by dx,dy
   */
  Vector.prototype.advance = function() {
    this.x += this.dx;
    this.y += this.dy;
  };

  /**
   * Get the minimum distance between two vectors
   * @param {Vector}
   * @return minDist
   */
  Vector.prototype.minDist = function(vec) {
    var minDist = Infinity;
    var max     = Math.max( Math.abs(this.dx), Math.abs(this.dy),
                            Math.abs(vec.dx ), Math.abs(vec.dy ) );
    var slice   = 1 / max;

    var x, y, distSquared;

    // get the middle of each vector
    var vec1 = {}, vec2 = {};
    vec1.x = this.x + this.width/2;
    vec1.y = this.y + this.height/2;
    vec2.x = vec.x + vec.width/2;
    vec2.y = vec.y + vec.height/2;
    for (var percent = 0; percent < 1; percent += slice) {
      x = (vec1.x + this.dx * percent) - (vec2.x + vec.dx * percent);
      y = (vec1.y + this.dy * percent) - (vec2.y + vec.dy * percent);
      distSquared = x * x + y * y;

      minDist = Math.min(minDist, distSquared);
    }

    return Math.sqrt(minDist);
  };

  /**
   * The player object
   */
  var player = (function(player) {
    // add properties directly to the player imported object
    player.width  = 79.6;
    player.height = 80;
    player.speed  = 4;

    // jumping
    player.gravity   = 1;
    player.dy        = 0;
    player.jumpDy    = -10;
    player.isFalling = false;
    player.isJumping = false;

    // spritesheets
    player.sheet     = new SpriteSheet('../assets/images/redneck-run.png', player.width, player.height);
    player.walkAnim  = new Animation(player.sheet, 5, 0, 4);
    player.jumpAnim  = new Animation(player.sheet, 5, 3, 3);
    player.fallAnim  = new Animation(player.sheet, 5, 3, 3);
    player.anim      = player.walkAnim;

    Vector.call(player, 0, 0, 0, player.dy);

    var jumpCounter = 0;  // how long the jump button can be pressed down

    /**
     * Update the player's position and animation
     */
    player.update = function() {

      // jump if not currently jumping or falling
      if (KEY_STATUS.space && player.dy === 0 && !player.isJumping) {
        player.isJumping = true;
        player.dy = player.jumpDy;
        jumpCounter = 12;
      }

      // jump higher if the space bar is continually pressed
      if (KEY_STATUS.space && jumpCounter) {
        player.dy = player.jumpDy;
      }

      jumpCounter = Math.max(jumpCounter-1, 0);

      this.advance();

      // add gravity
      if (player.isFalling || player.isJumping) {
        player.dy += player.gravity;
      }

      // change animation if falling
      if (player.dy > 0) {
        player.anim = player.fallAnim;
      }
      // change animation is jumping
      else if (player.dy < 0) {
        player.anim = player.jumpAnim;
      }
      else {
        player.anim = player.walkAnim;
      }

      player.anim.update();
    };

    /**
     * Draw the player at it's current position
     */
    player.draw = function() {
      player.anim.draw(player.x, player.y);
    };

    /**
     * Reset the player's position
     */
    player.reset = function() {
      player.x = 164;
      player.y = 250;
    };

    return player;
  })(Object.create(Vector.prototype));

  /**
   * Sprites are anything drawn to the screen (ground, enemies, etc.)
   * @param {integer} x - Starting x position of the player
   * @param {integer} y - Starting y position of the player
   * @param {string} type - Type of sprite
   */
  function Sprite(x, y, type) {
    this.x      = x;
    this.y      = y;
    this.width  = platformWidth;
    this.height = platformWidth;
    this.type   = type;
    Vector.call(this, x, y, 0, 0);

    /**
     * Update the Sprite's position by the player's speed
     */
    this.update = function() {
      this.dx = -player.speed;
      this.advance();
    };

    /**
     * Draw the sprite at it's current position
     */
    this.draw = function() {
      ctx.save();
      ctx.translate(0.5,0.5);
      ctx.drawImage(assetLoader.imgs[this.type], this.x, this.y);
      ctx.restore();
    };
  }
  Sprite.prototype = Object.create(Vector.prototype);

  /**
   * Update all ground position and draw. Also check for collision against the player.
   */
  function updateGround() {
    // animate ground
    player.isFalling = true;
    for (var i = 0; i < ground.length; i++) {
      ground[i].update();
      ground[i].draw();

      // stop the player from falling when landing on a platform
      var angle;
      if (player.minDist(ground[i]) <= player.height/2 + platformWidth/2 &&
          (angle = Math.atan2(player.y - ground[i].y, player.x - ground[i].x) * 180/Math.PI) > -130 &&
          angle < -50) {
        player.isJumping = false;
        player.isFalling = false;
        player.y = ground[i].y - player.height + 5;
        player.dy = 0;
      }
    }

    // remove ground that have gone off screen
    if (ground[0] && ground[0].x < -platformWidth) {
      ground.splice(0, 1);
    }
  }

  /**
   * Update the players position and draw
   */
  function updatePlayer() {
    player.update();
    player.draw();

  }

 /**
   * Game loop
   */
  function animate() {
    if (!stop) {
      requestAnimFrame( animate );
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      background.draw();

      // update entities

      updateGround();
      updatePlayer();

    }
  }

  /**
   * Keep track of the spacebar events
   */
  var KEY_CODES = {
    32: 'space'
  };
  var KEY_STATUS = {};
  for (var code in KEY_CODES) {
    if (KEY_CODES.hasOwnProperty(code)) {
       KEY_STATUS[KEY_CODES[code]] = false;
    }
  }
  document.onkeydown = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = true;
    }
  };
  document.onkeyup = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
  };

  /**
   * Request Animation Polyfill
   */
  var requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback, element){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  /**
   * Start the game - reset all variables and entities, spawn ground and water.
   */
  function startGame() {
    ground = [];
    player.reset();
    stop = false;
    platformHeight = 2;
    platformLength = 15;


    for (var i = 0; i < 30; i++) {
      ground.push(new Sprite(i * (platformWidth-3), platformBase - platformHeight, 'grass'));
    }

    background.reset();

    animate();
  }

  assetLoader.downloadAll();
})();
