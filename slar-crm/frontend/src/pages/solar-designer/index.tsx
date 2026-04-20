import { useState, useCallback } from 'react';
import { Card, Button, Select, Steps, Typography, Divider, Switch, Row, Col, Tag, Statistic } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined, BulbOutlined, ThunderboltOutlined } from '@ant-design/icons';
import RoofMapper, { RoofSection } from '../../components/solar-designer/RoofMapper';
import Solar3DViewer from '../../components/solar-designer/Solar3DViewer';
import {
  generatePanelLayout,
  computeShadingAnalysis,
  latlngToMeters,
  PanelLayoutResult,
  PanelPosition,
} from '../../components/solar-designer/PanelLayoutEngine';

const { Title, Text } = Typography;

// Import panel database inline (bundled reference)
const PANEL_OPTIONS = [
  { label: 'Waaree 580W (2382×1134mm)', value: '580', pw: 1.134, ph: 2.382 },
  { label: 'Waaree 540W (2272×1134mm)', value: '540', pw: 1.134, ph: 2.272 },
  { label: 'Waaree 440W (2108×1048mm)', value: '440', pw: 1.048, ph: 2.108 },
  { label: 'JinkoSolar 580W (2465×1134mm)', value: 'jinko580', pw: 1.134, ph: 2.465 },
  { label: 'Canadian Solar 545W (2278×1134mm)', value: 'cs545', pw: 1.134, ph: 2.278 },
];

const EMPTY_LAYOUT: PanelLayoutResult = { panels: [], count: 0, coveredAreaSqM: 0, coveredAreaSqFt: 0, layoutEfficiency: 0, roofAreaSqM: 0 };

export default function SolarDesignerPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [roofSections, setRoofSections] = useState<RoofSection[]>([]);
  const [selectedPanel, setSelectedPanel] = useState(PANEL_OPTIONS[0]);
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [showShading, setShowShading] = useState(false);
  const [layout, setLayout] = useState<PanelLayoutResult>(EMPTY_LAYOUT);

  const handleRoofChange = useCallback((sections: RoofSection[]) => {
    setRoofSections(sections);
  }, []);

  const runLayoutEngine = useCallback(() => {
    if (roofSections.length === 0) return;

    // Aggregate all panels from all roof sections
    let allPanels: PanelPosition[] = [];
    let totalROofAreaSqM = 0;
    let totalCoveredSqM = 0;

    const firstPoly = roofSections[0].polygon;
    const globalCenterLat = firstPoly.reduce((s, p) => s + p.lat, 0) / firstPoly.length;
    const globalCenterLng = firstPoly.reduce((s, p) => s + p.lng, 0) / firstPoly.length;
    const globalCenter = { lat: globalCenterLat, lng: globalCenterLng };

    for (const section of roofSections) {
      const metersPoly = latlngToMeters(section.polygon, globalCenter);
      const obsMeters = section.obstructions.map(obs => latlngToMeters(obs, globalCenter));

      const result = generatePanelLayout({
        roofPolygon: metersPoly,
        obstructions: obsMeters,
        panelWidthM: selectedPanel.pw,
        panelHeightM: selectedPanel.ph,
        tiltDeg: section.tiltDeg,
        azimuthDeg: section.azimuthDeg,
        orientation,
        edgeSetbackM: 0.5,
        rowSpacingMultiplier: 1.5,
        maxPanelsPerString: 14,
      });

      // Offset panel IDs for multi-section
      const offsetPanels = result.panels.map(p => ({ ...p, id: allPanels.length + p.id }));
      allPanels = [...allPanels, ...offsetPanels];
      totalROofAreaSqM += result.roofAreaSqM;
      totalCoveredSqM += result.coveredAreaSqM;
    }

    // Compute shading analysis
    const section = roofSections[0];
    const obsMetersAll = section.obstructions.map(obs => latlngToMeters(obs, globalCenter));
    const analyzedPanels = computeShadingAnalysis(allPanels, obsMetersAll, section.tiltDeg);

    setLayout({
      panels: analyzedPanels,
      count: analyzedPanels.length,
      coveredAreaSqM: totalCoveredSqM,
      coveredAreaSqFt: totalCoveredSqM * 10.7639,
      layoutEfficiency: totalROofAreaSqM > 0 ? totalCoveredSqM / totalROofAreaSqM : 0,
      roofAreaSqM: totalROofAreaSqM,
    });

    setCurrentStep(2);
  }, [roofSections, selectedPanel, orientation]);

  const panelWattage = parseInt(selectedPanel.value) || 540;
  const systemKw = (layout.count * panelWattage) / 1000;
  const avgShading = layout.panels.length > 0
    ? Math.round(layout.panels.reduce((s, p) => s + p.shadingPercent, 0) / layout.panels.length)
    : 0;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-start">
        <div>
          <Title level={3} className="!mb-1">
            <BulbOutlined className="mr-2 text-yellow-500" />
            Solar Roof Designer
          </Title>
          <Text type="secondary">Trace your roof, place panels, and preview 3D simulation</Text>
        </div>
        {layout.count > 0 && (
          <div className="flex gap-4">
            <Tag color="blue" className="text-base px-3 py-1">{layout.count} Panels</Tag>
            <Tag color="green" className="text-base px-3 py-1">{systemKw.toFixed(1)} kW System</Tag>
          </div>
        )}
      </div>

      <Steps
        current={currentStep}
        onChange={setCurrentStep}
        items={[
          { title: 'Trace Roof', description: 'Draw on satellite map' },
          { title: 'Configure', description: 'Panel type & layout' },
          { title: '3D Preview', description: 'View with sun simulation' },
        ]}
        className="mb-6"
      />

      {/* Step 0: Roof Mapper */}
      {currentStep === 0 && (
        <Card bordered={false} className="shadow-sm">
          <RoofMapper
            lat={28.6139}
            lng={77.2090}
            onChange={handleRoofChange}
          />
          <div className="flex justify-end mt-4">
            <Button
              type="primary"
              disabled={roofSections.length === 0}
              icon={<ArrowRightOutlined />}
              onClick={() => setCurrentStep(1)}
            >
              Next: Configure Layout
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Panel Configuration */}
      {currentStep === 1 && (
        <Card bordered={false} className="shadow-sm">
          <Title level={4}>Panel & Layout Configuration</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card size="small" title="Panel Selection" className="shadow-sm">
                <div className="space-y-4">
                  <div>
                    <Text className="text-sm font-medium block mb-2">Panel Model</Text>
                    <Select
                      className="w-full"
                      value={selectedPanel.value}
                      onChange={val => setSelectedPanel(PANEL_OPTIONS.find(p => p.value === val) || PANEL_OPTIONS[0])}
                      options={PANEL_OPTIONS.map(p => ({ label: p.label, value: p.value }))}
                    />
                  </div>

                  <div>
                    <Text className="text-sm font-medium block mb-2">Orientation</Text>
                    <div className="flex gap-2">
                      <Button
                        type={orientation === 'PORTRAIT' ? 'primary' : 'default'}
                        onClick={() => setOrientation('PORTRAIT')}
                        className="flex-1"
                      >
                        Portrait ▯
                      </Button>
                      <Button
                        type={orientation === 'LANDSCAPE' ? 'primary' : 'default'}
                        onClick={() => setOrientation('LANDSCAPE')}
                        className="flex-1"
                      >
                        Landscape ▭
                      </Button>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Panel Width</span><strong>{selectedPanel.pw * 100}cm</strong></div>
                    <div className="flex justify-between"><span>Panel Height</span><strong>{selectedPanel.ph * 100}cm</strong></div>
                    <div className="flex justify-between"><span>Setback from edge</span><strong>0.5 m</strong></div>
                    <div className="flex justify-between"><span>Max string length</span><strong>14 panels</strong></div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="Roof Summary" className="shadow-sm">
                <div className="space-y-3">
                  {roofSections.map(sec => (
                    <div key={sec.id} className="border rounded-lg p-3 border-l-4" style={{ borderLeftColor: sec.color }}>
                      <div className="font-semibold text-sm">{sec.name}</div>
                      <div className="text-xs text-apple-textMuted mt-1 grid grid-cols-2 gap-1">
                        <span>Area: {sec.areaSqFt.toLocaleString()} sq ft</span>
                        <span>Tilt: {sec.tiltDeg}°</span>
                        <span>Azimuth: {sec.azimuthDeg}°</span>
                        <span>Obst: {sec.obstructions.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          <div className="flex justify-between mt-6">
            <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>Back</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={runLayoutEngine} size="large">
              Generate Panel Layout & 3D Preview
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: 3D Viewer */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <div className="flex justify-between items-center">
                <span>3D Solar Design Preview</span>
                <div className="flex items-center gap-3">
                  <Switch
                    checkedChildren="Shading ON"
                    unCheckedChildren="Shading OFF"
                    checked={showShading}
                    onChange={setShowShading}
                  />
                </div>
              </div>
            }
          >
            <Solar3DViewer
              roofSections={roofSections}
              panelLayout={layout}
              panelWidthM={selectedPanel.pw}
              panelHeightM={selectedPanel.ph}
              showShading={showShading}
            />
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm text-center">
                <Statistic title="Panels Placed" value={layout.count} valueStyle={{ color: '#2563eb' }} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm text-center">
                <Statistic title="System Size" value={systemKw.toFixed(1)} suffix="kW" valueStyle={{ color: '#10b981' }} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm text-center">
                <Statistic
                  title="Layout Efficiency"
                  value={Math.round(layout.layoutEfficiency * 100)}
                  suffix="%"
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm text-center">
                <Statistic
                  title="Avg Shading"
                  value={avgShading}
                  suffix="%"
                  valueStyle={{ color: avgShading > 25 ? '#ef4444' : avgShading > 10 ? '#f59e0b' : '#10b981' }}
                />
              </Card>
            </Col>
          </Row>

          <div className="flex justify-between">
            <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(1)}>Reconfigure</Button>
            <Button type="primary" size="large">
              Use This Layout in Proposal →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
