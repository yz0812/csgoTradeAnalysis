# 构建图标说明

为了获得最佳打包效果，您可以在此目录中放置应用图标：

## 图标文件要求

### Windows
- 文件名：`icon.ico`
- 尺寸：256x256 或更大
- 格式：ICO (包含多种尺寸)

### macOS
- 文件名：`icon.icns`
- 尺寸：512x512 或 1024x1024
- 格式：ICNS

### Linux
- 文件名：`icon.png`
- 尺寸：512x512
- 格式：PNG (透明背景)

## 注意事项

- 如果不提供图标文件，electron-builder 会使用默认图标
- 可以使用在线工具生成 ICO 和 ICNS 格式：
  - https://www.icoconverter.com/
  - https://iconverticons.com/
- 当前配置中，Windows 不需要图标配置即可正常打包
- macOS 和 Linux 图标是可选的，缺失时会使用默认图标

## 当前状态

当前未提供图标文件，打包时将使用 Electron 默认图标。
