import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, FileText, Eye, EyeOff, Loader2, RefreshCw, DollarSign, 
  Calendar, Clock, TrendingUp, CreditCard, Banknote, CalendarDays,
  BarChart3
} from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import * as Recharts from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers';
import { Service, User as UserType } from '@/types';

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const { fetchAdminMetrics, fetchAdminServices, fetchAdminUsers } = useApp();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current tab from URL
  const currentTab = searchParams.get('tab') || 'overview';

  const loadData = async () => {
    setIsLoading(true);
    const [metricsData, servicesData, usersData] = await Promise.all([
      fetchAdminMetrics(),
      fetchAdminServices({ limit: 50 }),
      fetchAdminUsers({ limit: 50 }),
    ]);
    setMetrics(metricsData);
    setServices(servicesData.services);
    setUsers(usersData.users);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Overview Tab Content
  const OverviewTab = () => {
    const stats = metrics ? [
      { label: 'Total Users', value: metrics.totalUsers || 0, icon: Users, color: 'text-blue-500' },
      { label: 'Total Organizers', value: metrics.totalOrganizers || 0, icon: Users, color: 'text-purple-500' },
      { label: 'Total Services', value: metrics.totalServices || 0, icon: FileText, color: 'text-green-500' },
      { label: 'Total Revenue', value: formatCurrency(metrics.totalRevenue || 0), icon: DollarSign, color: 'text-amber-500' },
    ] : [];

    const bookingStats = metrics ? [
      { label: 'Total Bookings', value: metrics.totalBookings || 0, icon: Calendar, color: 'text-primary' },
      { label: 'Successful', value: metrics.successfulBookings || 0, icon: TrendingUp, color: 'text-green-500' },
      { label: 'Online Payments', value: metrics.onlinePayments || 0, icon: CreditCard, color: 'text-blue-500' },
      { label: 'Cash Payments', value: metrics.cashPayments || 0, icon: Banknote, color: 'text-amber-500' },
    ] : [];

    const analyticsStats = metrics ? [
      { 
        label: 'Most Popular Day', 
        value: metrics.popularDayOfWeek?.day || 'N/A', 
        subValue: `${metrics.popularDayOfWeek?.count || 0} bookings`,
        icon: CalendarDays, 
        color: 'text-indigo-500' 
      },
      { 
        label: 'Busiest Date', 
        value: metrics.popularDate?.date ? new Date(metrics.popularDate.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A', 
        subValue: `${metrics.popularDate?.count || 0} bookings`,
        icon: Calendar, 
        color: 'text-pink-500' 
      },
      { 
        label: 'Peak Time Slot', 
        value: metrics.popularTimeSlot?.time || 'N/A', 
        subValue: `${metrics.popularTimeSlot?.count || 0} bookings`,
        icon: Clock, 
        color: 'text-cyan-500' 
      },
    ] : [];

    return (
      <div className="space-y-8">
        {/* Main Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Booking Stats */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Booking Statistics</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bookingStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                        <stat.icon size={20} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Analytics Stats */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Booking Analytics
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {analyticsStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-card to-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-xl font-bold mt-1">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${stat.color}`}>
                        <stat.icon size={20} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Day of Week Breakdown (Bar Chart) */}
        {metrics?.dayOfWeekBreakdown && metrics.dayOfWeekBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Day of Week</CardTitle>
                <CardDescription>Distribution of bookings across the week</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    bookings: { label: 'Bookings', color: '#6366f1' },
                  }}
                  className="w-full h-64"
                >
                  <Recharts.BarChart data={metrics.dayOfWeekBreakdown} margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" />
                    <Recharts.XAxis dataKey="day" tickFormatter={d => d.slice(0, 3)} />
                    <Recharts.YAxis allowDecimals={false} />
                    <Recharts.Tooltip />
                    <Recharts.Bar dataKey="count" name="Bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </Recharts.BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Services Summary */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye size={20} />
                  Published Services
                </CardTitle>
                <CardDescription>{metrics?.publishedServices || 0} services are live</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-500">{metrics?.publishedServices || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeOff size={20} />
                  Unpublished Services
                </CardTitle>
                <CardDescription>{metrics?.unpublishedServices || 0} services are drafts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-muted-foreground">{metrics?.unpublishedServices || 0}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  };

  // Users Tab Content
  const UsersTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage platform users</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === 'admin' ? 'destructive' : 
                        user.role === 'organizer' ? 'default' : 'secondary'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.verified ? 'default' : 'outline'}>
                        {user.verified ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // Services Tab Content
  const ServicesTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
          <CardDescription>Overview of all services on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No services yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.organizerName}</TableCell>
                    <TableCell>{service.category || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={service.isPublished ? 'default' : 'secondary'}>
                        {service.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(service.price)}</TableCell>
                    <TableCell>{service.city || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render content based on current tab
  const renderContent = () => {
    switch (currentTab) {
      case 'users':
        return <UsersTab />;
      case 'services':
        return <ServicesTab />;
      default:
        return <OverviewTab />;
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'users':
        return 'User Management';
      case 'services':
        return 'Service Management';
      default:
        return 'Admin Dashboard';
    }
  };

  const getDescription = () => {
    switch (currentTab) {
      case 'users':
        return 'View and manage platform users';
      case 'services':
        return 'View and manage all services';
      default:
        return 'Platform overview and analytics';
    }
  };

  return (
    <div className="p-6 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>
          <p className="text-muted-foreground">{getDescription()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {renderContent()}
    </div>
  );
}
