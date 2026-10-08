import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/processor'
    },
    {
      path: '/processor',
      name: 'Processor',
      component: () => import('@/views/TextProcessor.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue')
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('@/views/History.vue')
    },
    {
      path: '/custom-rules',
      name: 'CustomRules',
      component: () => import('@/views/CustomRules.vue')
    },
    {
      path: '/ai-processor',
      name: 'AiProcessor',
      component: () => import('@/views/AiProcessor.vue')
    },
    {
      path: '/translator',
      name: 'Translator',
      component: () => import('@/views/Translator.vue')
    },
    {
      path: '/image-translator',
      name: 'ImageTranslator',
      component: () => import('@/views/ImageTranslator.vue')
    },
    {
      path: '/ocr',
      name: 'Ocr',
      component: () => import('@/views/Ocr.vue')
    }
  ]
});

export default router;
