// RBACComponents.jsx ito
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RBACManager, ROLES, PERMISSIONS } from './rbacManager'; // Fixed import

// Component to conditionally render based on roles
export function RoleBasedComponent({ 
  requiredRoles = [], 
  requiredPermissions = [],
  fallbackComponent = null,
  unauthorizedMessage = "You don't have permission to view this content.",
  children 
}) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [requiredRoles, requiredPermissions]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const canAccess = await RBACManager.canAccess(requiredRoles, requiredPermissions);
      setHasAccess(canAccess);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    if (fallbackComponent) {
      return fallbackComponent;
    }
    
    return (
      <View style={styles.unauthorizedContainer}>
        <Text style={styles.unauthorizedText}>{unauthorizedMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Admin-only component
export function AdminOnly({ children, fallbackComponent, unauthorizedMessage }) {
  return (
    <RoleBasedComponent
      requiredRoles={[ROLES.ADMIN]}
      fallbackComponent={fallbackComponent}
      unauthorizedMessage={unauthorizedMessage || "Admin access required"}
    >
      {children}
    </RoleBasedComponent>
  );
}

// Teacher-only component  
export function TeacherOnly({ children, fallbackComponent, unauthorizedMessage }) {
  return (
    <RoleBasedComponent
      requiredRoles={[ROLES.TEACHER]}
      fallbackComponent={fallbackComponent}
      unauthorizedMessage={unauthorizedMessage || "Teacher access required"}
    >
      {children}
    </RoleBasedComponent>
  );
}

// Student-only component
export function StudentOnly({ children, fallbackComponent, unauthorizedMessage }) {
  return (
    <RoleBasedComponent
      requiredRoles={[ROLES.STUDENT]}
      fallbackComponent={fallbackComponent}
      unauthorizedMessage={unauthorizedMessage || "Student access required"}
    >
      {children}
    </RoleBasedComponent>
  );
}

// Component for admin and teacher access
export function AdminOrTeacherOnly({ children, fallbackComponent, unauthorizedMessage }) {
  return (
    <RoleBasedComponent
      requiredRoles={[ROLES.ADMIN, ROLES.TEACHER]}
      fallbackComponent={fallbackComponent}
      unauthorizedMessage={unauthorizedMessage || "Admin or Teacher access required"}
    >
      {children}
    </RoleBasedComponent>
  );
}

// Component to check specific permissions
export function PermissionBasedComponent({ 
  requiredPermissions, 
  children, 
  fallbackComponent, 
  unauthorizedMessage 
}) {
  return (
    <RoleBasedComponent
      requiredPermissions={requiredPermissions}
      fallbackComponent={fallbackComponent}
      unauthorizedMessage={unauthorizedMessage || "Insufficient permissions"}
    >
      {children}
    </RoleBasedComponent>
  );
}

// Hook for checking roles and permissions in components
export function useRBAC() {
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoleAndPermissions();
  }, []);

  const loadUserRoleAndPermissions = async () => {
    try {
      setLoading(true);
      const [role, permissions] = await Promise.all([
        RBACManager.getCurrentUserRole(),
        RBACManager.getUserPermissions()
      ]);
      
      setUserRole(role);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error loading user role and permissions:', error);
      setUserRole(null);
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = async (role) => {
    return await RBACManager.hasRole(role);
  };

  const hasAnyRole = async (roles) => {
    return await RBACManager.hasAnyRole(roles);
  };

  const hasPermission = async (permission) => {
    return await RBACManager.hasPermission(permission);
  };

  const hasAnyPermission = async (permissions) => {
    return await RBACManager.hasAnyPermission(permissions);
  };

  const canAccess = async (requiredRoles = [], requiredPermissions = []) => {
    return await RBACManager.canAccess(requiredRoles, requiredPermissions);
  };

  const isAdmin = userRole === ROLES.ADMIN;
  const isTeacher = userRole === ROLES.TEACHER;
  const isStudent = userRole === ROLES.STUDENT;

  return {
    userRole,
    userPermissions,
    loading,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    canAccess,
    isAdmin,
    isTeacher,
    isStudent,
    refresh: loadUserRoleAndPermissions
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  unauthorizedContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 10,
  },
  unauthorizedText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RoleBasedComponent;