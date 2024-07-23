export const fetchData = async (): Promise<any[]> => {
  const response = await fetch("data.json");
  const data = await response.json();
  return data;
};

export const runTSNEAndPlot = async (
  data: any[]
): Promise<{ plotData: any[]; layout: any }> => {
  return { plotData: [], layout: {} };
};
