/**
 * Created by Peter on 2016/10/23.
 */
// CBoard settings
var settings = {
    //web界面选择中文设置为:cn
    preferredLanguage: "cn" // en/cn: Switch language to Chinese
};

var CB_I18N;
var CB_HOMEPAGE_SETTING;

$.ajax({
    url: "i18n/" + settings.preferredLanguage + "/cboard.json",
    type: "GET",
    dataType: "json",
    success: function(data) {
        return CB_I18N = data;
    },
    async: false
});

$.ajax({
    url: "homepage/mine.do",
    type: "GET",
    dataType: "json",
    success: function(data) {
    	CB_HOMEPAGE_SETTING = data;
    	return CB_HOMEPAGE_SETTING;
    },
    async: false
});