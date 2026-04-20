import { useState } from 'react';
import { Table, Tag, Button, Input, Typography, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api as backendApi } from '../../lib/api';
import { PhoneOutlined, EnvironmentOutlined, EyeOutlined, BulbOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { Search } = Input;

const DEMO_LEADS = [
  { id: 'demo-1', leadCode: 'LD-001', name: 'Rajesh Kumar', phone: '+91 98765 43210', city: 'New Delhi', address: '12, Lajpat Nagar, New Delhi', status: 'NEW', email: 'rajesh.kumar@gmail.com' },
  { id: 'demo-2', leadCode: 'LD-002', name: 'Priya Sharma', phone: '+91 87654 32109', city: 'Gurgaon', address: '45, Sector 14, Gurgaon', status: 'FOLLOW_UP', email: 'priya.sharma@yahoo.com' },
  { id: 'demo-3', leadCode: 'LD-003', name: 'Amit Verma', phone: '+91 76543 21098', city: 'Noida', address: '78, Sector 62, Noida', status: 'VISIT_SCHEDULED', email: 'amit.verma@outlook.com' },
  { id: 'demo-4', leadCode: 'LD-004', name: 'Sunita Patel', phone: '+91 65432 10987', city: 'Faridabad', address: '23, NIT, Faridabad', status: 'PROPOSAL_SENT', email: 'sunita.patel@gmail.com' },
  { id: 'demo-5', leadCode: 'LD-005', name: 'Vikram Singh', phone: '+91 54321 09876', city: 'New Delhi', address: '56, Dwarka Sector 10, New Delhi', status: 'NEGOTIATION', email: 'vikram.singh@gmail.com' },
  { id: 'demo-6', leadCode: 'LD-006', name: 'Meena Agarwal', phone: '+91 43210 98765', city: 'Ghaziabad', address: '89, Indirapuram, Ghaziabad', status: 'WON', email: 'meena.agarwal@gmail.com' },
  { id: 'demo-7', leadCode: 'LD-007', name: 'Deepak Joshi', phone: '+91 32109 87654', city: 'New Delhi', address: '34, Rohini Sector 3, New Delhi', status: 'NEW', email: 'deepak.joshi@gmail.com' },
  { id: 'demo-8', leadCode: 'LD-008', name: 'Kavita Rao', phone: '+91 21098 76543', city: 'Gurgaon', address: '67, DLF Phase 2, Gurgaon', status: 'FOLLOW_UP', email: 'kavita.rao@gmail.com' },
  { id: 'demo-9', leadCode: 'LD-009', name: 'Suresh Nair', phone: '+91 10987 65432', city: 'Noida', address: '90, Sector 18, Noida', status: 'LOST', email: 'suresh.nair@gmail.com' },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'default',
  FOLLOW_UP: 'blue',
  VISIT_SCHEDULED: 'orange',
  PROPOSAL_SENT: 'purple',
  NEGOTIATION: 'magenta',
  WON: 'green',
  LOST: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  FOLLOW_UP: 'Follow Up',
  VISIT_SCHEDULED: 'Visit Scheduled',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

interface Lead {
  id: string;
  leadCode: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  status: string;
}

export default function LeadsBoard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['sales-leads'],
    queryFn: async () => {
      const res = await backendApi.get('/leads', { params: { limit: 100 } });
      return res.data.data.leads;
    }
  });

  const leads = (leadsData && leadsData.length > 0) ? leadsData : DEMO_LEADS;

  const filteredLeads = leads.filter((l: Lead) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm) ||
    l.leadCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ColumnsType<Lead> = [
    {
      title: 'Lead Code',
      dataIndex: 'leadCode',
      key: 'leadCode',
      width: 120,
      render: (code: string) => <span className="font-semibold">{code}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Lead) => (
        <div>
          <div className="font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/salesperson/leads/${record.id}`)}>
            {name}
          </div>
          {record.email && <div className="text-xs text-gray-500">{record.email}</div>}
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone: string) => (
        <div className="flex items-center gap-1 text-sm">
          <PhoneOutlined className="text-gray-400" />
          {phone}
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'city',
      key: 'city',
      width: 180,
      render: (city: string, record: Lead) => (
        <div className="flex items-center gap-1 text-sm">
          <EnvironmentOutlined className="text-gray-400" />
          {city || record.address || '-'}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      filters: [
        { text: 'New', value: 'NEW' },
        { text: 'Follow Up', value: 'FOLLOW_UP' },
        { text: 'Visit Scheduled', value: 'VISIT_SCHEDULED' },
        { text: 'Proposal Sent', value: 'PROPOSAL_SENT' },
        { text: 'Negotiation', value: 'NEGOTIATION' },
        { text: 'Won', value: 'WON' },
        { text: 'Lost', value: 'LOST' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record: Lead) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/salesperson/leads/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            icon={<BulbOutlined />}
            className="text-purple-600 hover:text-purple-700"
            onClick={() => navigate('/studio')}
          >
            Proposal
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Title level={4} className="!mb-0">My Leads</Title>
        <Search
          placeholder="Search by name, phone, or lead code..."
          allowClear
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-md"
          size="large"
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredLeads}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} leads`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        className="bg-white dark:bg-apple-cardDark rounded-lg shadow-sm"
        onRow={(record) => ({
          className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5',
          onClick: (e) => {
            // Don't navigate if clicking on action buttons
            const target = e.target as HTMLElement;
            if (!target.closest('button') && !target.closest('a')) {
              navigate(`/salesperson/leads/${record.id}`);
            }
          },
        })}
      />
    </div>
  );
}
