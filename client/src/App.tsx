import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Challans from './pages/Challans';
import Logs from './pages/Logs';
import { Users, Warehouse, FileText, LogOut, History } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('customers');

  // Set default tab based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'WAREHOUSE') {
        setActiveTab('products');
      } else {
        setActiveTab('customers');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--gray-50)' }}>
        <p style={{ fontWeight: 500, color: 'var(--gray-500)', fontSize: '0.875rem' }}>Loading Operations Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Tabs configured with icons and roles
  const tabs = [
    {
      id: 'customers',
      name: 'CRM Customers',
      icon: <Users size={16} />,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      id: 'products',
      name: 'Inventory Products',
      icon: <Warehouse size={16} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'challans',
      name: 'Sales Challans',
      icon: <FileText size={16} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'logs',
      name: 'Inventory Logs',
      icon: <History size={16} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
  ];

  const visibleTabs = tabs.filter((tab) => tab.roles.includes(user.role));

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'customers':
        return <Customers />;
      case 'products':
        return <Products />;
      case 'challans':
        return <Challans />;
      case 'logs':
        return <Logs />;
      default:
        return <div className="card">Tab not found</div>;
    }
  };

  const getPageTitleRoot = () => {
    switch (activeTab) {
      case 'customers':
        return 'CRM';
      case 'products':
        return 'Inventory';
      case 'challans':
        return 'Invoices';
      case 'logs':
        return 'Inventory';
      default:
        return 'Workspace';
    }
  };

  const getPageTitleSub = () => {
    switch (activeTab) {
      case 'customers':
        return 'Customers';
      case 'products':
        return 'Products';
      case 'challans':
        return 'Challans';
      case 'logs':
        return 'Logs';
      default:
        return 'Table';
    }
  };

  return (
    <div className="portal-container">
      {/* Sidebar Navigation (Screenshot style) */}
      <aside className="sidebar">
        {/* User Profile Info Card instead of spaces-selector */}
        <div className="sidebar-brand-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.25rem 0.5rem' }}>
            <div className="nav-profile-gradient" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 500, textTransform: 'capitalize' }}>
                {user.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="workspace-section-header">Workspace</div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {visibleTabs.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`menu-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="menu-icon">{tab.icon}</span>
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings and Log out in Footer */}
        <div className="sidebar-footer">
          <button
            className="menu-item"
            onClick={logout}
            style={{ color: '#dc2626' }}
          >
            <span className="menu-icon"><LogOut size={16} style={{ color: '#dc2626' }} /></span>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-wrapper">
        <header className="navbar">
          {/* Breadcrumbs style title */}
          <div className="navbar-breadcrumbs">
            <span className="breadcrumb-root">{getPageTitleRoot()}</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">{getPageTitleSub()}</span>
          </div>
          
        </header>

        <section className="content-container">
          {renderActiveContent()}
        </section>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
