///////////////////////////////////////////////////////////////////////////////
// Common Functions

activityStaticMap = function(activity, showMarker) {
  if (_.isUndefined(showMarker))
    showMarker = false;

  if(!activity.lat || !activity.lng) {
    return "";
  }

  var dimensions = "720x240";
  var apiKey = appSettings.mapsApiKey;
  
  imageUrl = "https://maps.googleapis.com/maps/api/staticmap?_=:random&zoom=:zoom&sensor=false&size=:dimensions&maptype=roadmap&visible=:lat,:lng";
  imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                      replace(/:random/, Math.round((new Date()).getTime() / 1000)).
                      replace(/:zoom/, (!!parseInt(activity.mapZoom) ? activity.mapZoom : 12)).
                      replace(/:lng/g, activity.lng).
                      replace(/:lat/g, activity.lat).
                      replace(/:label/, encodeURIComponent(activity.location));

  if (apiKey != "")
    imageUrl = imageUrl + "&key=" + apiKey;

  if (showMarker) {
    imageUrl = imageUrl + "&markers=color:green|label::label|:lat,:lng";
    imageUrl = imageUrl.replace(/:lng/g, activity.lng).
                        replace(/:lat/g, activity.lat).
                        replace(/:label/, encodeURIComponent(activity.location));
  }

  // get correct dpi image
  imageUrl = imageUrl + "&scale=" + window.devicePixelRatio;

  return imageUrl;
};

///////////////////////////////////////////////////////////////////////////////
// Map Count Control

Template.activityCountControl.events({
  "click .load-more": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    ReactiveGroupFilter.set("limit", ReactiveGroupFilter.get("limit") + App.Defaults.mapLimitSkip);
  }
});

Template.activityCountControl.helpers({
  // count of activities shown on map is either the current set "limit", or the activities
  // count if it is less than the "limit", eg all activities have been fetched
  loadMore: function () {

    var groupId = ReactiveGroupFilter.get("group"),
        groupInfo = GroupInfo.findOne(groupId),
        limit = ReactiveGroupFilter.get("limit") || 0,
        country = ReactiveGroupFilter.get("country"),
        total = 0;

    if (!groupInfo)
      return "";

    if (country)
      total = groupInfo.counts[country];
    else
      total = _.reduce(_.values(groupInfo.counts), function(memo, num){ return memo + num; }, 0);

    limit = total < limit ? total : limit;
 
    var classNames = "",
        linkText = "";

    if (limit < total) {
      classNames = "load-more action button";
      linkText = limit + "/" + total + " - More";
    } else {
      return "";
    }

    var container = $("<li />");
    var link = $("<a />").addClass(classNames).attr("href", "#").html(linkText);
    var html = $('<div>').append(container.append(link));

    return new Handlebars.SafeString(html.html());
  }
});

///////////////////////////////////////////////////////////////////////////////
// Main Map

Template.mainMap.events({
  "dblclick .top-extra-handle > div": function (event, template) {
    var element = template.find(".top-extra"),
        oldHeight = element.style.height;

    element.style.height = "";
    var transitions = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
    $(element).one(transitions, function(event) {
      var newHeight = $(element).css("height");
      google.maps.event.trigger(mappingFsm.map, 'resize');
      mappingFsm.map.panBy(0, (parseInt(oldHeight) - parseInt(newHeight)) / 2);      
    });
  }
});

Template.mainMap.helpers({
  userTypeCls: function() {
    var isMember = App.belongsToGroup(),
        group = ReactiveGroupFilter.get("group");

    return (group && isMember) ? "with-member" : "";
  }
})

Template.mainMap.rendered = function () {
  logIfDev("++ Rendered map: " + JSON.stringify(this.data));

  ////
  // FIXME: remove timer and use a better method to ensure map canvas 
  //        elements are in the dom before creating the map

  setTimeout(function () {
    $(".top-extra-handle").draggable({
      axis: "y", 
      containment: [ 0, 150, 9999, 9999 ],
      helper: "clone",
      start: function(){
          var $this = $(this);
          $this.siblings(".top-extra").addClass("no-transition");
          $this.data("start-top", $this.position().top);
          $this.data("last-top", $this.position().top);
      },
      drag: function (event, ui) { 
        var $this = $(this);
        var height = ui.offset.top; 
        $(this).prev().height(height);
        mappingFsm.map.panBy(0, ($this.data("last-top") - height) / 2);
        $this.data("last-top", height);
      },
      stop: function () {
        $(this).siblings(".top-extra").removeClass("no-transition");
        google.maps.event.trigger(mappingFsm.map, "resize");        
      }
    });
  }, 1000);
};