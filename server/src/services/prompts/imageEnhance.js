/**
 * 图片增强提示词模板
 * 用途：精修 / 风格迁移 / 颜色变换 / 虚拟试衣 / 幽灵模特
 */

export const imageEnhance = {
  retouch: {
    description: '产品图片精修',
    template: `Enhance this product image with professional retouching:
- Remove dust, scratches, and imperfections
- Adjust brightness and contrast for optimal presentation
- Sharpen product details
- Color correction for accurate product representation
- Maintain natural product appearance
Style: {style}`,
    params: ['style'],
    defaults: { style: 'natural' },
  },

  colorSwap: {
    description: '产品颜色变换',
    template: 'Change the color of this product to {targetColor} while preserving all textures, shadows, highlights, and material properties. The product should look like it was originally manufactured in {targetColor}.',
    params: ['targetColor'],
    defaults: { targetColor: 'black' },
  },

  styleTransfer: {
    description: '风格迁移',
    template: 'Apply {style} artistic style to this product image. Maintain the product\'s shape and key features while adapting the visual aesthetic. Reference style: {styleReference}. Blend ratio: {blendRatio}.',
    params: ['style', 'styleReference', 'blendRatio'],
    defaults: { style: 'minimalist', blendRatio: 0.6 },
  },

  virtualTryon: {
    description: '虚拟试衣',
    template: 'Dress the model with this garment. The garment should conform to the model\'s pose and body shape naturally. Preserve fabric texture, folds, and lighting consistency. The result should look like a real fashion photo.',
    params: ['modelType', 'garmentCategory'],
    defaults: { modelType: 'standard', garmentCategory: 'top' },
  },

  ghostMannequin: {
    description: '幽灵模特（3D 立体展示）',
    template: `Create a 3D ghost mannequin effect for this garment. Show:
- Front view with invisible mannequin effect
- Inside neck label area showing back side
- Natural 3D curvature and depth
- Clean white background
The garment should appear to be worn by an invisible person, showing proper 3D shape.`,
    params: ['garmentType', 'showAngle'],
    defaults: { garmentType: 'top', showAngle: 'front' },
  },
};
