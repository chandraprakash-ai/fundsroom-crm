import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Challans from './pages/Challans';
import { Users, Warehouse, FileText, LogOut, User } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('customers');

  // Set the default active tab based on user's role on login
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Loading Operations Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Define tab navigation based on role permissions
  const tabs = [
    {
      id: 'customers',
      name: 'CRM Customers',
      icon: <Users size={18} />,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      id: 'products',
      name: 'Inventory Products',
      icon: <Warehouse size={18} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'challans',
      name: 'Sales Challans',
      icon: <FileText size={18} />,
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
      default:
        return <div className="card">Tab not found</div>;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'customers':
        return 'Customer Relationships';
      case 'products':
        return 'Warehouse & Inventory';
      case 'challans':
        return 'Billing & Invoices';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="portal-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">F</div>
          <span className="brand-name">FundsRoom ERP</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {visibleTabs.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`menu-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            className="menu-item"
            onClick={logout}
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', color: 'var(--color-danger-text)' }}
          >
            <LogOut size={18} />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Layout */}
      <main className="main-wrapper">
        <header className="navbar">
          <h1 className="navbar-title">{getPageTitle()}</h1>
          
          <div className="user-profile">
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className={`badge ${
                user.role === 'ADMIN' ? 'badge-danger' :
                user.role === 'SALES' ? 'badge-success' :
                user.role === 'ACCOUNTS' ? 'badge-info' : 'badge-warning'
              }`} style={{ alignSelf: 'flex-start', marginTop: '0.125rem' }}>
                {user.role}
              </span>
            </div>
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
