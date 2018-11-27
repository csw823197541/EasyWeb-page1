layui.define(['config', 'admin', 'layer', 'laytpl', 'element', 'form'], function (exports) {
    var $ = layui.$;
    var config = layui.config;
    var admin = layui.admin;
    var layer = layui.layer;
    var laytpl = layui.laytpl;
    var element = layui.element;
    var form = layui.form;

    var main = {
        // 渲染左侧导航栏
        initLeftNav: function () {
            // 判断权限
            for (var i = config.menus.length - 1; i >= 0; i--) {
                var tempMenu = config.menus[i];
                if (tempMenu.auth && !admin.hasPerm(tempMenu.auth)) {
                    config.menus.splice(i, 1);
                    continue;
                }
                if (!tempMenu.subMenus) {
                    continue;
                }
                for (var j = tempMenu.subMenus.length - 1; j >= 0; j--) {
                    var jMenus = tempMenu.subMenus[j];
                    if (jMenus.auth && !admin.hasPerm(jMenus.auth)) {
                        tempMenu.subMenus.splice(j, 1);
                        continue;
                    }
                    if (!jMenus.subMenus) {
                        continue;
                    }
                    for (var k = jMenus.subMenus.length - 1; k >= 0; k--) {
                        if (jMenus.subMenus[k].auth && !admin.hasPerm(jMenus.subMenus[k].auth)) {
                            jMenus.subMenus.splice(k, 1);
                            continue;
                        }
                    }
                }
            }
            // 去除空的目录
            for (var i = config.menus.length - 1; i >= 0; i--) {
                var tempMenu = config.menus[i];
                if (tempMenu.subMenus && tempMenu.subMenus.length <= 0) {
                    config.menus.splice(i, 1);
                    continue;
                }
                if (!tempMenu.subMenus) {
                    continue;
                }
                for (var j = tempMenu.subMenus.length - 1; j >= 0; j--) {
                    var jMenus = tempMenu.subMenus[j];
                    if (jMenus.subMenus && jMenus.subMenus.length <= 0) {
                        tempMenu.splice(j, 1);
                        continue;
                    }
                }
            }
            // 渲染
            $('.layui-layout-admin .layui-side').load('components/side.html', function () {
                laytpl(sideNav.innerHTML).render(config.menus, function (html) {
                    $('#sideNav').after(html);
                });
                element.render('nav');
                admin.activeNav(Q.lash);
            });
        },
        // 路由注册
        initRouter: function () {
            main.regRouter(config.menus);
            Q.init({
                main: 'console'
            });
        },
        // 使用递归循环注册
        regRouter: function (menus) {
            $.each(menus, function (i, data) {
                if (data.url && data.url.indexOf('#!') == 0) {
                    Q.reg(data.url.substring(2), function () {
                        var menuId = data.url.substring(2);
                        var menuPath = 'components/' + data.path;
                        main.loadView(menuId, menuPath, data.name);
                    });
                }
                if (data.subMenus) {
                    main.regRouter(data.subMenus);
                }
            });
        },
        // 路由加载组件
        loadView: function (menuId, menuPath, menuName) {
            var contentDom = '.layui-layout-admin .layui-body';
            admin.showLoading('.layui-layout-admin .layui-body');
            var flag;  // 选项卡是否添加
            // 判断是否开启了选项卡功能
            if (config.pageTabs) {
                $('.layui-layout-admin .layui-body .layui-tab .layui-tab-title>li').each(function (index) {
                    if ($(this).attr('lay-id') === menuId) {
                        flag = true;
                    }
                });
                if (!flag) {
                    element.tabAdd('admin-pagetabs', {
                        title: menuName,
                        content: '<div id="' + menuId + '"></div>',
                        id: menuId
                    });
                }
                contentDom = '#' + menuId;
                element.tabChange('admin-pagetabs', menuId);
                admin.rollPage('auto');
                // 切换tab关闭表格内浮窗
                $('.layui-table-tips-c').trigger('click');
                // 解决切换tab滚动条时而消失的问题
                var $iframe = $('.layui-layout-admin .layui-body .layui-tab-content .layui-tab-item.layui-show .admin-iframe')[0];
                if ($iframe) {
                    $iframe.style.height = "99%";
                    $iframe.scrollWidth;
                    $iframe.style.height = "100%";
                }
            }
            if (!flag || admin.isRefresh) {
                $(contentDom).load(menuPath, function () {
                    admin.isRefresh = false;
                    element.render('breadcrumb');
                    form.render('select');
                    admin.removeLoading('.layui-layout-admin .layui-body');
                });
            } else {
                admin.removeLoading('.layui-layout-admin .layui-body');
            }
            admin.activeNav(Q.lash);
            // 移动设备切换页面隐藏侧导航
            if (document.body.clientWidth <= 750) {
                admin.flexible(true);
            }
        },
        // 从服务器获取登录用户的信息
        getUser: function (success) {
            layer.load(2);
            admin.req('/sys/users/userInfo', null, function (data) {
                layer.closeAll('loading');
                console.log(data);
                if (200 === data.code) {
                    config.putUser(data.user);
                    success(data.user);
                } else {
                    layer.msg('获取用户失败', {icon: 2});
                    location.replace('index.html');
                }
            }, 'GET');
        },
        // 页面元素绑定事件监听
        bindEvent: function () {
            // 退出登录
            $('#btnLogout').click(function () {
                layer.confirm('确定退出登录？', function () {
                    config.removeToken();

                    location.replace('index.html');
                });
            });
            // 修改密码
            $('#setPsw').click(function () {
                admin.popupRight('components/tpl/password.html');
            });
            // 个人信息
            $('#setInfo').click(function () {
                admin.popupCenter({
                    title: '个人信息',
                    path: 'components/tpl/userInfo.html',
                    area: ['750px', '480px'],
                    btnAlign: 'l',
                    finish: function () {

                    }
                });
            });
            // 消息
            $('#btnMessage').click(function () {
                admin.popupRight('components/tpl/message.html');
            });
        },
        // 检查多标签功能是否开启
        checkPageTabs: function () {
            // 加载主页
            if (config.pageTabs) {
                $('.layui-layout-admin').addClass('open-tab');
                element.tabAdd('admin-pagetabs', {
                    title: '<i class="layui-icon layui-icon-home"></i>',
                    content: '<div id="console"></div>',
                    id: 'console'
                });
                $('#console').load('components/console.html', function () {
                });
            } else {
                $('.layui-layout-admin').removeClass('open-tab');
            }
        },
        // 打开新页面
        openNewTab: function (param) {
            var url = param.url;
            var title = param.title;
            var menuId = param.menuId;
            if (!menuId) {
                menuId = url.replace(/[?:=&/]/g, '_');
            }

            Q.reg(menuId, function () {
                main.loadView(menuId, url, title);
            });

            Q.go(menuId);
        },
        // 关闭选项卡
        closeTab: function (menuId) {
            element.tabDelete('admin-pagetabs', menuId);
        }
    };

    // tab选项卡切换监听
    element.on('tab(admin-pagetabs)', function (data) {
        var layId = $(this).attr('lay-id');
        Q.go(layId);
    });

    exports('main', main);
});
