Gallery = {};

(function($) {
  /**

      @class
      @constructor

      @example var trovebox = new Gallery.Trovebox();

      @author https://github.com/rollick

      @requires jQuery

      @returns Instance
  */

  Gallery.Trovebox = function( domain, album, albumKey ) {
    this.domain     = domain;
    this.album      = album || null;
    this.albumKey   = albumKey || null;

    this.options = {
      max: 30,                       // photos to return
      imageSize: 'medium',           // photo size ( thumb,small,medium,big,original )
      thumbSize: 'thumb',            // thumbnail size ( thumb,small,medium,big,original )
      description: false,            // set this to true to get description as caption
      backlink: false                // set this to true if you want to pass a link back to the original image
    };
  };

  Gallery.Trovebox.prototype = {
    constructor: Gallery.Trovebox,

    albumSearch: function( params, callback ) {
      if ( typeof params.album != 'string' ) {
        throw( 'No trovebox album provided' );
      }
      
      this.setOptions( params );

      return this._search( this.options, callback );
    },

    setOptions: function( params ) {
      $.extend(this.options, params);
      return this;
    },

    _call: function( params, callback ) {

      if (typeof params.domain != 'string')
        throw( 'No trovebox domain provided' );
      
      var url = 'https://' + params.domain + '/photos/album-' + params.album + '/token-' + params.albumKey + '/list.json?';

      var scope = this;

      params = $.extend({
        pageSize: params.max,
        tags : params.tags || null,
        returnSizes : '72x72,104x104,320x320,640x640,720x720,1024x1024,1600x1600',
      }, params );

      $.each(params, function( key, value ) {
        if (value != null)
          url += '&' + key + '=' + value;
      });

      $.getJSON(url, function(data) {
        if ( data.code === 200 ) {
          callback.call(scope, data);
        } else {
          throw( data.code.toString() + ' ' + data.stat + ': ' + data.message );
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
            image: photo.path720x720,
            big: photo.pathBase,
            title: photo.title,
            description: photo.description
          });
        }

        callback.call( this, gallery, params );
      })
    },
  };

}( jQuery ) );