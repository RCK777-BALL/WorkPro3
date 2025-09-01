import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      auth: {
        register: 'Register',
        login: 'Login',
        forgotPassword: 'Forgot Password?',
        name: 'Name',
        email: 'Email',
        password: 'Password',
        tenantId: 'Tenant ID',
        employeeId: 'Employee ID',
        alreadyHaveAccount: 'Already have an account?',
        registrationFailed: 'Registration failed',
        logout: 'Logout',
      },
      nav: {
        dashboard: 'Dashboard',
        assets: 'Assets',
        workOrders: 'Work Orders',
        maintenance: 'Maintenance',
        pmTasks: 'PM Tasks',
        inventory: 'Inventory',
        timesheets: 'Timesheets',
        messages: 'Messages',
        departments: 'Departments',
        analytics: 'Analytics',
        teams: 'Team',
        settings: 'Settings',
        documentation: 'Documentation',
        logout: 'Logout',
      },
      sidebar: {
        complete: '{{value}}% complete',
      },
      header: {
        helpResources: 'Help & Resources',
        helpSubtitle: 'Get assistance and learn more',
        documentation: 'Documentation',
        documentationDesc: 'Browse detailed guides and references',
        videoTutorials: 'Video Tutorials',
        videoTutorialsDesc: 'Watch step-by-step tutorials',
        liveChat: 'Live Chat Support',
        liveChatDesc: 'Chat with our support team',
        knowledgeBase: 'Knowledge Base',
        knowledgeBaseDesc: 'Find answers to common questions',
        noNotifications: 'No notifications',
        viewAll: 'View All Notifications',
        needHelp: 'Need immediate assistance?',
        contactSupport: 'Contact Support',
        notifications: 'Notifications',
        demoMode: 'Demo Mode',
        liveData: 'Live Data',
        searchPlaceholder: 'Search assets, work orders, etc...'
      },
    },
  },
  es: {
    translation: {
      auth: {
        register: 'Registrarse',
        login: 'Iniciar sesión',
        forgotPassword: '¿Olvidaste tu contraseña?',
        name: 'Nombre',
        email: 'Correo electrónico',
        password: 'Contraseña',
        tenantId: 'ID de inquilino',
        employeeId: 'ID de empleado',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        registrationFailed: 'Registro fallido',
        logout: 'Cerrar sesión',
      },
      nav: {
        dashboard: 'Tablero',
        assets: 'Activos',
        workOrders: 'Órdenes de trabajo',
        maintenance: 'Mantenimiento',
        pmTasks: 'Tareas PM',
        inventory: 'Inventario',
        timesheets: 'Hojas de tiempo',
        messages: 'Mensajes',
        departments: 'Departamentos',
        analytics: 'Analíticas',
        teams: 'Equipo',
        settings: 'Configuración',
        documentation: 'Documentación',
        logout: 'Cerrar sesión',
      },
      sidebar: {
        complete: '{{value}}% completo',
      },
      header: {
        helpResources: 'Ayuda y Recursos',
        helpSubtitle: 'Obtén asistencia y aprende más',
        documentation: 'Documentación',
        documentationDesc: 'Explora guías detalladas y referencias',
        videoTutorials: 'Tutoriales en video',
        videoTutorialsDesc: 'Mira tutoriales paso a paso',
        liveChat: 'Chat en vivo',
        liveChatDesc: 'Chatea con nuestro equipo de soporte',
        knowledgeBase: 'Base de conocimientos',
        knowledgeBaseDesc: 'Encuentra respuestas a preguntas comunes',
        noNotifications: 'Sin notificaciones',
        viewAll: 'Ver todas las notificaciones',
        needHelp: '¿Necesitas asistencia inmediata?',
        contactSupport: 'Contactar soporte',
        notifications: 'Notificaciones',
        demoMode: 'Modo demo',
        liveData: 'Datos en vivo',
        searchPlaceholder: 'Buscar activos, órdenes de trabajo, etc...'
      },
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

