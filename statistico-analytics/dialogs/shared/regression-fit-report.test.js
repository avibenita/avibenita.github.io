const Engine = require('./process-settings-engine.js');
const Report = require('./regression-fit-report.js');
const Contrib = require('./regression-contribution.js');

function fittedDemo() {
  const session = Engine.createSession();
  const demo = Engine.demoPreset();
  session.loadData(demo.table);
  session.configure(demo.config);
  session.setSpecifications(demo.specifications);
  session.setCurrentSettings(demo.current);
  const fitted = session.finishFit(session.beginFit());
  if (!fitted.applied) throw new Error(fitted.reason || 'demo fit failed');
  return session.read();
}

test('reports a drop as the difference of the two displayed R² percentages', () => {
  const drop = Contrib.reportedDrop(57.81 / 100, 11.20 / 100);
  expect(drop.fullText).toBe('57.81%');
  expect(drop.reducedText).toBe('11.20%');
  expect(drop.pointsText).toBe('46.61 pp');
  expect(drop.points).toBeCloseTo(46.61, 2);
});

test('binds Process Results to the active fit', () => {
  const view = fittedDemo();
  const model = view.model;
  const overview = Report.processOverview(view);
  const technical = Report.processTechnical(view);
  const r2 = Contrib.reportedDrop(model.r2, 0).fullText;
  const adj = Contrib.reportedDrop(model.adjR2, 0).fullText;
  const temperature = Contrib.chartDrop(model.contributions.Temperature.fullR2, model.contributions.Temperature.reducedR2);
  expect(temperature.pointsText).toBe(Contrib.fixed(model.contributions.Temperature.drop * 100, 2) + ' pp');
  expect(Contrib.chartDrop(57.81 / 100, 11.20 / 100).pointsText).toBe('46.61 pp');

  expect(model.ssModel + model.ssResidual).toBeCloseTo(model.ssTotal, 8);
  expect(overview).toContain('Model Conclusion');
  expect(overview).toContain(r2);
  expect(overview).toContain(adj);
  expect(overview).toContain('F-test p');
  expect(overview).toContain('data-contribution="Temperature ' + temperature.pointsText + '"');
  expect(overview).toContain('Full-model R² = ' + temperature.fullText);
  expect(overview).toContain('Starting settings');
  expect(overview).toContain('Temperature: 90');
  expect(overview).toContain('Recipe: A');
  expect(overview).toContain('LSL 68');
  expect(overview).toContain('Target 72');
  expect(overview).toContain('USL 75');
  expect(overview).toContain('Open Prediction Profiler');
  expect(overview).toContain('Std. error');
  expect(overview).toContain('>t<');
  expect(overview).toContain('95% CI lower');
  expect(overview).toContain('Fitted equation');
  expect(overview).toContain('Yield');

  expect(technical).toContain('Model specification');
  expect(technical).toContain('Temperature (adjustable)');
  expect(technical).toContain('Recipe (adjustable)');
  expect(technical).toContain('Temperature × Recipe');
  expect(technical).toContain('reference level A');
  expect(technical).toContain('Sample accounting');
  expect(technical).toContain('Analyzed rows');
  expect(technical).toContain('>12<');
  expect(technical).toContain('Sum of squares');
  expect(technical).toContain('Mean square');
  expect(technical).toContain('Residual standard deviation');
  expect(technical).toContain(Contrib.fixed(model.rmse, 2));
  expect(technical).toContain('projected output curve');
});
