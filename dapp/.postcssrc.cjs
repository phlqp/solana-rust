var autoprefixer = require('autoprefixer');

module.exports = {
    plugins: {
        'tailwindcss': {
            content: [
              '!./**/node_modules/**',
              './**/*.{html,js,vue,ts,md}',
              './.vitepress/**/*.{html,js,vue,ts,md}',
            ],
            plugins: [
              require('@tailwindcss/forms'),
            ],
          },
      'postcss-prefix-selector': {
        prefix: ':not(:where(.vp-raw *))',
        includeFiles: [/vp-doc\.css/],
        transform(prefix, _selector) {
          const [selector, pseudo = ''] = _selector.split(/(:\S*)$/)
          return selector + prefix + pseudo
        }
      },
      'autoprefixer': {}
    }
  }