import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inventory',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/pages/login/login.page')
      .then(m => m.LoginPage)
  },
  {
    path: 'inventory',
    canActivate: [authGuard], // Requiere estar autenticado (Admin o Standard)
    loadComponent: () => import('./features/inventory/pages/inventory-list/inventory-list.page')
      .then(m => m.InventoryListPage)
  },
  {
    path: 'inventory/new',
    canActivate: [authGuard, roleGuard], // Exclusivo Administrador
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/inventory/pages/product-form/product-form.page')
      .then(m => m.ProductFormPage)
  },
  {
    path: 'inventory/edit/:id',
    canActivate: [authGuard, roleGuard], // Exclusivo Administrador
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/inventory/pages/product-form/product-form.page')
      .then(m => m.ProductFormPage)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard], // Exclusivo Administrador
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/dashboard/pages/admin-dashboard.page')
      .then(m => m.AdminDashboardPage)
  },
  {
    path: 'movements',
    canActivate: [authGuard],
    loadComponent: () => import('./features/movements/pages/movement-history/movement-history.page')
      .then(m => m.MovementHistoryPage)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/unauthorized/unauthorized.page')
      .then(m => m.UnauthorizedPage)
  },
  {
    path: '**',
    redirectTo: 'inventory'
  }
];