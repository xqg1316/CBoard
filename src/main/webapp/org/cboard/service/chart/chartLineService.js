/**
 * Created by yfyuan on 2016/10/28.
 * 折线图
 */
'use strict';
cBoard.service('chartLineService', function ($state, $window) {

    this.render = function (containerDom, option, scope, persist, drill, relations, chartConfig) {
        var render = new CBoardEChartRender(containerDom, option);
        render.addClick(chartConfig, relations, $state, $window);
        return render.chart(null, persist);
    };

    this.parseOption = function (data) {

        var chartConfig = data.chartConfig;
        var casted_keys = data.keys;
        var casted_values = data.series;
        var aggregate_data = data.data;
        var newValuesConfig = data.seriesConfig;
        var series_data = [];//原有的写法,下面的是修改的写法,让折线图显示数字
        // var series_data = new Array();
        var string_keys = _.map(casted_keys, function (key) {
            return key.join('-');
        });
        var tunningOpt = chartConfig.option;

        var zipDataWithCfg = _.chain(aggregate_data)
            .map(function (data, i) {
                var joined_values = casted_values[i].join('-');
                var s = newValuesConfig[joined_values];
                s.key = joined_values;
                s.data = data;
                return s;
            }).value()

        var sum_data = _.chain(zipDataWithCfg)
            .groupBy(function (item) {
                return item.valueAxisIndex;
            })
            .map(function (axisSeries) {
                var sumArr = [];
                for (var i = 0; i < axisSeries[0].data.length; i++) {
                    var sumItem = 0;
                    for (var j = 0; j < axisSeries.length; j++) {
                        var cell = axisSeries[j].data[i];
                        sumItem += cell ? Number(cell) : 0;
                    }
                    sumArr.push(sumItem)
                }
                return sumArr;
            })
            .value();

        for (var j = 0; aggregate_data[0] && j < aggregate_data[0].length; j++) {
            for (var i = 0; i < aggregate_data.length; i++) {
                aggregate_data[i][j] = aggregate_data[i][j] ? Number(aggregate_data[i][j]) : 0;
            }
        }

        for (var i = 0; i < zipDataWithCfg.length; i++) {
            var s = zipDataWithCfg[i];
            s.name = s.key;
            var sumData = sum_data[s.valueAxisIndex];
            if (s.type.indexOf('percent') > -1) {
                if (chartConfig.valueAxis === 'horizontal') {
                    s.data = _.map(s.data, function (e, i) {
                        return (e / sumData[i] * 100).toFixed(2);
                    })
                } else {
                    s.data = _.map(s.data, function (e, i) {
                        return [i, (e / sumData[i] * 100).toFixed(2), e];
                    });
                }
            }
            s.coordinateSystem = chartConfig.coordinateSystem;

            if (s.type == 'stackbar') {
                s.type = 'bar';
                s.stack = s.valueAxisIndex.toString();
            } else if (s.type == 'percentbar') {
                s.type = 'bar';
                s.stack = s.valueAxisIndex.toString();
            } else if (s.type == "arealine") {
                s.type = "line";
                s.areaStyle = {normal: {}};
            } else if (s.type == "stackline") {
                s.type = "line";
                s.stack = s.valueAxisIndex.toString();
                s.areaStyle = {normal: {}};
            } else if (s.type == 'percentline') {
                s.type = "line";
                s.stack = s.valueAxisIndex.toString();
                s.areaStyle = {normal: {}};
            }
            if (chartConfig.valueAxis == 'horizontal') {
                s.xAxisIndex = s.valueAxisIndex;
            } else {
                s.yAxisIndex = s.valueAxisIndex;
            }
            series_data.push(s);
        }

        var valueAxis = angular.copy(chartConfig.values);
        _.each(valueAxis, function (axis, index) {
            axis.axisLabel = {
                formatter: function (value) {
                    return numbro(value).format("0a.[0000]");
                }
            };
            if (axis.series_type == "percentbar" || axis.series_type == "percentline") {
                axis.min = 0;
                axis.max = 100;
            } else {
                axis.min = axis.min ? axis.min : null;
                axis.max = axis.max ? axis.max : null;
            }
            if (index > 0) {
                axis.splitLine = false;
            }
            axis.scale = true;
        });

        if (tunningOpt) {
            var labelInterval, labelRotate;
            tunningOpt.ctgLabelInterval ? labelInterval = tunningOpt.ctgLabelInterval : 'auto';
            tunningOpt.ctgLabelRotate ? labelRotate = tunningOpt.ctgLabelRotate : 0;
        }

        var categoryAxis = {
            type: 'category',
            data: string_keys,
            axisLabel: {
                interval: labelInterval,
                rotate: labelRotate
            },
            boundaryGap: false
        };

        _.each(valueAxis, function (axis) {
            var _stype = axis.series_type;
            if (_stype.indexOf('bar') !== -1) {
                categoryAxis.boundaryGap = true;
            }
        });

        var echartOption = {
            grid: angular.copy(echartsBasicOption.grid),
            legend: {
                data: _.map(casted_values, function (v) {
                    return v.join('-');
                })
            },
            tooltip: {
                formatter: function (params) {
                    var name = params[0].name;
                    var s = name + "</br>";
                    for (var i = 0; i < params.length; i++) {
                        s += '<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:' + params[i].color + '"></span>';
                        if (params[i].value instanceof Array) {
                            s += params[i].seriesName + " : " + params[i].value[1] + "% (" + params[i].value[2] + ")<br>";
                        } else {
                            s += params[i].seriesName + " : " + params[i].value + "<br>";
                        }
                    }
                    return s;
                },
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
                }
            },
            /** 修改-折线图/柱形图，显示数据、修改颜色、柱形图设置最大宽度 */
            /**
             * 需求：
             * 每个折线图和柱形图上都显示数字；
             * 折线图和柱形图修改对应的颜色；
             * 柱形图宽度最大设置，使得柱形图不是非常宽；
             *
             * 修改过程：
             *
             * 图形其实是echarts图（参照echarts官网，文档-配置项手册、实例）
             * 修改charLineService.js文件
             */
            // series: series_data//替换成下面的形式

            series: series_data.map(function (item) {
                item.label = {
                    normal: {
                        /** 每个折线图和柱形图上都显示数字设置为true,不显示设置为false */
                        show: false,
                        position: 'top'
                    }
                }
                return item

            }),
            /** 设置折线图和柱形图修改对应的颜色 */
            color: ['#1FA3FF', '#FF9336', '#00A65A', '#A5E7F0', '#B67365', '#FFD92F', '#91C7AE', '#F66EB8', '#96A331', '#E41A1C', '#CD79FF']//,
            // color: ['#1FA3FF', '#FF9336']//,
            // barMaxWidth: 100//柱形图宽度最大设置，使得柱形图不是非常宽

        };

        if (chartConfig.coordinateSystem == 'polar') {
            echartOption.angleAxis = chartConfig.valueAxis == 'horizontal' ? valueAxis : categoryAxis;
            echartOption.radiusAxis = chartConfig.valueAxis == 'horizontal' ? categoryAxis : valueAxis;
            echartOption.polar = {};
        } else {
            echartOption.xAxis = chartConfig.valueAxis == 'horizontal' ? valueAxis : categoryAxis;
            echartOption.yAxis = chartConfig.valueAxis == 'horizontal' ? categoryAxis : valueAxis;
        }

        if (chartConfig.valueAxis === 'horizontal') {
            echartOption.grid.left = 'left';
            echartOption.grid.containLabel = true;
            echartOption.grid.bottom = '5%';
        }
        if (chartConfig.valueAxis === 'vertical' && chartConfig.values.length > 1) {
            echartOption.grid.right = 40;
        }

        // Apply tunning options
        updateEchartOptions(tunningOpt, echartOption);

        return echartOption;
    };
});
