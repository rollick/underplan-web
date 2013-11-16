///////////////////////////////////////////////////////////////////////////////
// Common


// Use a reactive source to ensure the template will reactively load
// the photos once they have been fetched from the external data source
ReactiveGallerySource = {
  photos: {},
  states: {},
  stateDeps: {},

  clearPhotos: function (id) {
    this.photos[id] = null;
    this.set(id, '');
  },

  setPhotos: function (id, photos) {
    this.photos[id] = photos;
    this.set(id, 'ready');
  },

  get: function (id) {
    this.ensureDep(id);
    this.stateDeps[id].depend();
    return this.states[id];
  },

  set: function (id, state) {
    this.ensureDep(id);
    this.states[id] = state;
    this.stateDeps[id].changed();
  },

  ensureDep: function (id) {
    if (!this.stateDeps[id])
      this.stateDeps[id] = new Deps.Dependency;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Image Slider

sliderOptions = {
  // autoPlay: true,
  nextButton: true,
  prevButton: true,
  autoPlayDelay: 3000,
};

// Store list of sliders so they can be destroyed when the associated 
// template is destroyed
sliders = {};

Template.imageSlider.events({
  "click .sequence": function (event, template) {
    // If the image is clicked then route to activity
    var target = $(event.target);
    if (target.hasClass("main")) {
      var match = target.closest(".sequence").attr("id").match(/^.*-([a-z|0-9]+)/i);
      if (match)
        Router.setActivity(match[1]);
    }
  }
});

Template.imageSlider.photos = function () {
  if(ReactiveGallerySource.get(this._id) === "ready") {
    console.log("Loading slider for: " + this._id);
    return ReactiveGallerySource.photos[this._id];
  }
  else
    return [];
};

Template.imageSlider.singlePhoto = function () {
  return ReactiveGallerySource.get(this._id)
};

Template.imageSlider.created = function () {
  processActivityPhotos(this.data);
};

Template.imageSlider.rendered = function () {
  var slider = this.find("#slider-" + this.data._id);

  if (slider) {
    var gallery = $(slider).sequence(sliderOptions).data("sequence");
    gallery.afterLoaded = function(){
        $(slider).find(".sequence-prev, .sequence-next").fadeIn(500);
    }

    sliders[this.data._id] = gallery;
  }
};

Template.imageSlider.destroyed = function() {
  var id = this.data._id;

  if(sliders[id] && _.isFunction(sliders[id].destroy)) {
    sliders[id].destroy();
    delete sliders[id];
  }
};