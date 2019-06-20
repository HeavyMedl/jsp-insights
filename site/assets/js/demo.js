$().ready(function() {
  $sidebar = $('.sidebar');
  $sidebar_img_container = $sidebar.find('.sidebar-background');

  $full_page = $('.full-page');

  $sidebar_responsive = $('body > .navbar-collapse');

  window_width = $(window).width();

  fixed_plugin_open = $('.sidebar .sidebar-wrapper .nav li.active a p').html();

  if (window_width > 767 && fixed_plugin_open == 'Dashboard') {
    if ($('.fixed-plugin .dropdown').hasClass('show-dropdown')) {
      $('.fixed-plugin .dropdown').addClass('show');
    }
  }

  $('.fixed-plugin a').click(function(event) {
    // Alex if we click on switch, stop propagation of the event, so the dropdown will not be hide, otherwise we set the  section active
    if ($(this).hasClass('switch-trigger')) {
      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (window.event) {
        window.event.cancelBubble = true;
      }
    }
  });

  $('.fixed-plugin .background-color span').click(function() {
    $(this).siblings().removeClass('active');
    $(this).addClass('active');

    let new_color = $(this).data('color');

    if ($sidebar.length != 0) {
      $sidebar.attr('data-color', new_color);
    }

    if ($full_page.length != 0) {
      $full_page.attr('filter-color', new_color);
    }

    if ($sidebar_responsive.length != 0) {
      $sidebar_responsive.attr('data-color', new_color);
    }
  });

  $('.fixed-plugin .img-holder').click(function() {
    $full_page_background = $('.full-page-background');

    $(this).parent('li').siblings().removeClass('active');
    $(this).parent('li').addClass('active');


    var new_image = $(this).find('img').attr('src');

    if ($sidebar_img_container.length != 0 && $('.switch-sidebar-image input:checked').length != 0) {
      $sidebar_img_container.fadeOut('fast', function() {
        $sidebar_img_container.css('background-image', 'url("' + new_image + '")');
        $sidebar_img_container.fadeIn('fast');
      });
    }

    if ($full_page_background.length != 0 && $('.switch-sidebar-image input:checked').length != 0) {
      var new_image_full_page = $('.fixed-plugin li.active .img-holder').find('img').data('src');

      $full_page_background.fadeOut('fast', function() {
        $full_page_background.css('background-image', 'url("' + new_image_full_page + '")');
        $full_page_background.fadeIn('fast');
      });
    }

    if ($('.switch-sidebar-image input:checked').length == 0) {
      var new_image = $('.fixed-plugin li.active .img-holder').find('img').attr('src');
      var new_image_full_page = $('.fixed-plugin li.active .img-holder').find('img').data('src');

      $sidebar_img_container.css('background-image', 'url("' + new_image + '")');
      $full_page_background.css('background-image', 'url("' + new_image_full_page + '")');
    }

    if ($sidebar_responsive.length != 0) {
      $sidebar_responsive.css('background-image', 'url("' + new_image + '")');
    }
  });

  $('.switch input').on('switchChange.bootstrapSwitch', function() {
    $full_page_background = $('.full-page-background');

    $input = $(this);

    if ($input.is(':checked')) {
      if ($sidebar_img_container.length != 0) {
        $sidebar_img_container.fadeIn('fast');
        $sidebar.attr('data-image', '#');
      }

      if ($full_page_background.length != 0) {
        $full_page_background.fadeIn('fast');
        $full_page.attr('data-image', '#');
      }

      background_image = true;
    } else {
      if ($sidebar_img_container.length != 0) {
        $sidebar.removeAttr('data-image');
        $sidebar_img_container.fadeOut('fast');
      }

      if ($full_page_background.length != 0) {
        $full_page.removeAttr('data-image', '#');
        $full_page_background.fadeOut('fast');
      }

      background_image = false;
    }
  });
});

type = ['primary', 'info', 'success', 'warning', 'danger'];

demo = {
  initDashboardPageCharts: function() {
    let dataSales = {
      labels: ['9:00AM', '12:00AM', '3:00PM', '6:00PM', '9:00PM', '12:00PM', '3:00AM', '6:00AM'],
      series: [
        // [300, 400, 500, 600, 700, 800, 900, 695, 752, 788, 846, 944],
        [287, 385, 490, 492, 554, 586, 698, 695, 752, 788, 846, 944],
        [67, 152, 143, 240, 287, 335, 435, 437, 539, 542, 544, 647],
        [23, 113, 67, 108, 190, 239, 307, 308, 439, 410, 410, 509],
      ],
    };
    let optionsSales = {
      lineSmooth: false,
      low: 0,
      high: 800,
      showArea: true,
      height: '245px',
      axisX: {
        showGrid: false,
      },
      lineSmooth: Chartist.Interpolation.simple({
        divisor: 3,
      }),
      showLine: false,
      showPoint: false,
      fullWidth: false,
    };

    let responsiveSales = [
      ['screen and (max-width: 640px)', {
        axisX: {
          labelInterpolationFnc: function(value) {
            return value[0];
          },
        },
      }],
    ];

    let chartHours = Chartist.Line('#chartHours', dataSales, optionsSales, responsiveSales);
  },
};
