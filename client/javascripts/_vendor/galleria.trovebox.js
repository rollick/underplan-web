(function($) {

  /*global jQuery, Galleria, window */
  Galleria.requires(1.25, 'The Trovebox Plugin requires Galleria version 1.2.5 or later.');

  // The script path
  var PATH = Galleria.utils.getScriptPath();

  Galleria.Trovebox = function( domain, album, albumKey ) {
    this.domain     = domain;
    this.album      = album || null;
    this.albumKey   = albumKey || null;

    this.options = {
      max: 30,                       // photos to return
      imageSize: 'medium',           // photo size ( thumb,small,medium,big,original )
      thumbSize: 'thumb',            // thumbnail size ( thumb,small,medium,big,original )
      description: false,            // set this to true to get description as caption
      complete: function(){},        // callback to be called inside the Galleria.prototype.load
      backlink: false                // set this to true if you want to pass a link back to the original image
    };
  };

  Galleria.Trovebox.prototype = {
    constructor: Galleria.Trovebox,

    albumSearch: function( options, callback ) {
      if ( typeof options.album != 'string' ) {
        Galleria.raise( 'No trovebox album provided' );
      }

      return this._search( options, callback );
    },

    _call: function( params, callback ) {

      if (typeof params.domain != 'string')
        Galleria.raise( 'No trovebox domain provided' );
      
      var url = 'http://' + params.domain + '/photos/album-' + params.album + '/token-' + params.albumKey + '/list.json?';

      var scope = this;

      params = $.extend({
        tags : params.tags || null,
        returnSizes : '72x72,104x104,320x320,640x640,1024x1024,1600x1600',
      }, params );

      $.each(params, function( key, value ) {
        if (value != null)
          url += '&' + key + '=' + value;
      });

      $.getJSON(url, function(data) {
        if ( data.code === 200 ) {
          callback.call(scope, data);
        } else {
          Galleria.raise( data.code.toString() + ' ' + data.stat + ': ' + data.message, true );
        }
      });
      return scope;
    },

    _search: function ( params, callback ) {
      return this._call( params, function(data) {

        var gallery = [],
            photos  = data.result,
            len     = photos.length;
            
        for ( i=0; i<len; i++ ) {
          photo = photos[i];

          gallery.push({
            thumb: photo.photo104x104[1] > 3*photo.photo104x104[2] ? photo.path320x320 : photo.path104x104,
            image: photo.path640x640,
            big: photo.pathBase,
            title: photo.title
          });
        }

        callback.call( this, gallery );
      })
    },
  };

  /**
      Galleria modifications
      We fake-extend the load prototype to make Picasa integration as simple as possible
  */


  // save the old prototype in a local variable

  var load = Galleria.prototype.load;


  // fake-extend the load prototype using the trovebox data

  Galleria.prototype.load = function() {

    // pass if no data is provided or trovebox option not found
    if ( arguments.length || typeof this._options.trovebox !== 'string' ) {
      load.apply( this, Galleria.utils.array( arguments ) );
      return;
    }

    // define some local vars
    var self = this,
        args = Galleria.utils.array( arguments ),
        trovebox = this._options.trovebox.split(':'),
        p,
        opts = $.extend({}, self._options.troveboxOptions),
        loader = typeof opts.loader !== 'undefined' ?
            opts.loader : $('<div>').css({
                width: 48,
                height: 48,
                opacity: 0.7,
                background:'#000 url('+PATH+'loader.gif) no-repeat 50% 50%'
            });

    if ( trovebox.length ) {

      // validate the method
      if ( typeof Galleria.Trovebox.prototype[ trovebox[0] ] !== 'function' ) {
        Galleria.raise( trovebox[0] + ' method not found in Trovebox plugin' );
        return load.apply( this, args );
      }

      // validate the argument
      if ( !trovebox[1] ) {
        Galleria.raise( 'No trovebox argument found' );
        return load.apply( this, args );
      }

      // apply the preloader
      window.setTimeout(function() {
        self.$( 'target' ).append( loader );
      },100);

      // create the instance
      p = new Galleria.Trovebox();

      // apply Flickr options
      if ( typeof self._options.troveboxOptions === 'object' ) {
        p.setOptions( self._options.troveboxOptions );
      }

      // call the trovebox method and trigger the DATA event
      var arg = [];
      if ( trovebox[0] == 'useralbum' ) {
        arg = trovebox[1].split('/');
        if (arg.length != 2) {
          Galleria.raise( 'Picasa useralbum not correctly formatted (should be [user]/[album])');
          return;
        }
      } else {
        arg.push( trovebox[1] );
      }

      arg.push(function(data) {
        self._data = data;
        loader.remove();
        self.trigger( Galleria.DATA );
        p.options.complete.call(p, data);
      });

      p[ trovebox[0] ].apply( p, arg );

    } else {
      // if trovebox array not found, pass
      load.apply( this, args );
    }
  };

}( jQuery ) );