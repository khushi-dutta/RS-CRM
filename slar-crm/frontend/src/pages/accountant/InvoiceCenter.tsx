import React, { useState } from 'react';
import { Card, Table, Tag, Button, Input, Modal, Select, message } from 'antd';
import { Search, FilePlus, Send, AlertCircle, CheckCircle } from 'lucide-react';
import CustomerLink from '../../components/CustomerLink';
const { Option } = Select;

const mockInvoices = [
  { id: 'INV-26048', date: '2026-03-22', customer: 'Priya Singh', amount: 250000, due: '2026-04-05', status: 'DRAFT' },
  { id: 'INV-26047', date: '2026-03-21', customer: 'Rahul Sharma', amount: 150000, due: '2026-04-01', status: 'PENDING' },
  { id: 'INV-26046', date: '2026-03-15', customer: 'Amit Desai', amount: 80000, due: '2026-03-25', status: 'PARTIAL' },
  { id: 'INV-26045', date: '2026-02-10', customer: 'Vikram Singh', amount: 150000, due: '2026-02-25', status: 'OVERDUE' },
  { id: 'INV-26044', date: '2026-01-05', customer: 'Neha Patel', amount: 350000, due: '2026-01-20', status: 'PAID' },
];

const InvoiceCenter: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [newInvoiceModal, setNewInvoiceModal] = useState(false);

  const handleBulkSend = () => {
    message.success("Invoice reminders sent to all Pending and Overdue clients.");
  };

  const handleCreateDraft = () => {
    message.success("Draft Invoice Generated successfully.");
    setNewInvoiceModal(false);
  };

  const columns = [
    { title: 'Invoice No.', dataIndex: 'id', key: 'id', render: (t: string) => <span className="font-bold text-apple-textLight dark:text-apple-textDark">{t}</span> },
    { title: 'Issue Date', dataIndex: 'date', key: 'date' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (t: string, r: any) => <CustomerLink name={t} customerId={r.id} /> },
    { title: 'Total Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => <span className="semibold text-apple-textLight dark:text-apple-textDark">₹{v.toLocaleString()}</span> },
    { title: 'Due Date', dataIndex: 'due', key: 'due' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (t: string) => {
        if (t === 'DRAFT') return <Tag color="default">Draft</Tag>;
        if (t === 'PENDING') return <Tag color="processing">Pending</Tag>;
        if (t === 'PARTIAL') return <Tag color="warning">Partial Paid</Tag>;
        if (t === 'OVERDUE') return <Tag color="error" icon={<AlertCircle size={12} className="mr-1 inline"/>}>Overdue</Tag>;
        if (t === 'PAID') return <Tag color="success" icon={<CheckCircle size={12} className="mr-1 inline"/>}>Paid</Tag>;
        return <Tag>{t}</Tag>;
      }
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_: unknown, r: any) => (
        <div className="flex gap-2">
          <Button size="small" type="link">View</Button>
          {(r.status === 'DRAFT') && <Button size="small" type="link">Edit</Button>}
          {(r.status === 'PENDING' || r.status === 'OVERDUE') && <Button size="small" type="link" className="text-amber-600">Remind</Button>}
        </div>
      )
    }
  ];

  return (
    <div className="p-6 bg-transparent min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-apple-textLight dark:text-apple-textDark">Invoice Center</h1>
        <div className="flex gap-3">
          <Button 
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
            icon={<Send size={16} />}
            onClick={handleBulkSend}
          >
            Bulk Send Pending
          </Button>
          <Button 
            type="primary" 
            icon={<FilePlus size={16} />}
            onClick={() => setNewInvoiceModal(true)}
          >
            Generate Invoice
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-lg" bodyStyle={{ padding: '16px 24px' }}>
        <div className="mb-4">
          <Input 
            placeholder="Search Invoice No. or Customer Name..." 
            prefix={<Search size={16} className="text-apple-gray"/>} 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table 
          columns={columns} 
          dataSource={mockInvoices} 
          rowKey="id"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* NEW INVOICE MODAL */}
      <Modal
        title="Generate New Invoice"
        open={newInvoiceModal}
        onOk={handleCreateDraft}
        onCancel={() => setNewInvoiceModal(false)}
        okText="Generate Draft"
      >
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-apple-textMuted font-medium mb-1">Select Customer</label>
            <Select showSearch placeholder="Search customer name or ID..." className="w-full">
              <Option value="CUST-8815">Neha Patel (CUST-8815)</Option>
              <Option value="CUST-8891">Rajesh Kumar (CUST-8891)</Option>
            </Select>
          </div>
          <div>
             <label className="block text-apple-textMuted font-medium mb-1">Milestone Billing</label>
             <Select placeholder="Select milestone..." className="w-full">
               <Option value="BOOKING">Booking / Advance</Option>
               <Option value="FIRST">First Installment</Option>
               <Option value="FINAL">Final Payment</Option>
               <Option value="CUSTOM">Custom Line Items</Option>
             </Select>
          </div>
          <div className="text-xs text-apple-textMuted bg-slate-100 p-2 rounded">
             This generates a DRAFT invoice based on the customer's accepted quotation. You can edit line items before sending it to the client.
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default InvoiceCenter;
