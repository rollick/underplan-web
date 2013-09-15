(function($) {

  /*global jQuery, Galleria, window */
  Galleria.requires(1.25, 'The Trovebox Plugin requires Galleria version 1.2.5 or later.');

  // The script path
  var PATH = Galleria.utils.getScriptPath();

  /**

      @class
      @constructor

      @example var trovebox = new Galleria.Trovebox();

      @author https://github.com/rollick

      @requires jQuery
      @requires Galleria

      @returns Instance
  */

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
      
      var url = 'https://' + params.domain + '/photos/album-' + params.album + '/token-' + params.albumKey + '/list.json?';

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

        callback.call( this, gallery, params );
      })
    },
  };

}( jQuery ) );