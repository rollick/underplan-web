Template.shortForm.events({
  'keyup .text': function (event, template) {
    var max = shortMaxLength();
    var textElem = template.find(".text");
    var countElem = template.find(".text-length span");
    var submit = template.find(".post");

    if(textElem.value.length > max) {
      $(submit).addClass("disabled");
    } else {
      $(submit).removeClass("disabled");
    }

    var count = max - textElem.value.length;
    countElem.innerHTML = count;
    if(count <= 10) {
      countElem.style.color = "red";
    } else {
      countElem.style.color = "";
    }
  },
  'keyup .location': function (event, template) {
    var location = template.find(".location").value;
    
    coords = geoLocation(location, function(geo) {
      if(typeof geo === "object") {
        var lat = geo.lat,
            lng = geo.lng,
            address = geo.address;

        template.find(".lat").value = lat;
        template.find(".lng").value = lng;

        template.find(".location-coords").innerHTML = Math.round(lat*10000)/10000 + ", " + Math.round(lng*10000)/10000 + " (" + address + ")";
      } else {
        template.find(".lat").value = "";
        template.find(".lng").value = "";

        template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
      }
    });
  },
  'click .post': function (event, template) {
    if($(template.find("a")).hasClass("disabled"))
      return false;

    var values = {};
    values.text     = template.find(".text").value;
    values.lat      = template.find(".lat").value;
    values.lng      = template.find(".lng").value;
    values.groupId  = getCurrentGroupId();

    if (values.groupId && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          template.find(".text").value = 
          template.find(".lat").value = 
          template.find(".lng").value = 
          template.find(".location").value = "";

          template.find(".text-length span").innerHTML = shortMaxLength();
        }
      });
    } else {
      Session.set("createError",
                  "It needs to have text");
    }
    return false;
  }
});