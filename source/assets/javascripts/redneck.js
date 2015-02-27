(function () {
  // define variables
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var player = {};
  var ground = [];
  var platformWidth = 110;
  var platformHeight = canvas.height - 43;

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
   * Game loop
   */
  function animate() {
    requestAnimFrame( animate );

    background.draw();

    for (i = 0; i < ground.length; i++) {
      ground[i].x -= player.speed;
      ctx.drawImage(assetLoader.imgs.grass, ground[i].x, ground[i].y);
    }

    if (ground[0].x <= -platformWidth) {
      ground.shift();
      ground.push({'x': ground[ground.length-1].x + platformWidth, 'y': platformHeight});
    }

    player.anim.update();
    player.anim.draw(164, 375);
  }

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
   * Start the game - reset all variables and entities, spawn platforms and water.
   */
  function startGame() {
    // setup the player
    player.width  = 80;
    player.height = 80;
    player.speed  = 4;
    player.sheet  = new SpriteSheet('../assets/images/redneck-run.png', player.width, player.height);
    player.anim   = new Animation(player.sheet, 5, 0, 3);

    // create the ground tiles
    for (i = 0, length = Math.floor(canvas.width / platformWidth) + 2; i < length; i++) {
      ground[i] = {'x': i * platformWidth, 'y': platformHeight};
    }

    background.reset();

    animate();
  }

  assetLoader.downloadAll();
})();
