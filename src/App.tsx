import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js-basic-dist";

var tsnejs: any;

const App: React.FC = () => {
  const plotContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("data.json");
      const data = await response.json();
      return data;
    };

    const runTSNEAndPlot = async () => {
      const data = await fetchData();
      const vectors = data.map((item: any) => item.vector);

      const tsne = new tsnejs.tSNE({
        dim: 3,
        perplexity: 5,
        earlyExaggeration: 4.0,
        learningRate: 100.0,
        nIter: 1000,
        metric: "euclidean",
      });

      tsne.initDataRaw(vectors);
      for (let i = 0; i < 500; i++) {
        tsne.step();
      }

      const reducedVectors = tsne.getSolution();
      const scatterPlot = {
        x: reducedVectors.map((v: any) => v[0]),
        y: reducedVectors.map((v: any) => v[1]),
        z: reducedVectors.map((v: any) => v[2]),
        mode: "markers",
        type: "scatter3d",
        marker: {
          size: 5,
          color: reducedVectors.map(
            (_: any, i: number) =>
              `hsl(${(360 * i) / reducedVectors.length}, 100%, 50%)`
          ),
          opacity: 0.8,
          line: {
            color: "black",
            width: 1,
          },
        },
        text: data.map((item: any) => item.base_name),
      };

      const layout = {
        title: "3D t-SNE Visualization",
        autosize: true,
        scene: {
          xaxis: { title: "X" },
          yaxis: { title: "Y" },
          zaxis: { title: "Z" },
        },
      };

      if (plotContainer.current) {
        Plotly.newPlot(
          plotContainer.current,
          [scatterPlot as unknown as any],
          layout
        );
      }
    };

    runTSNEAndPlot();
  }, []);

  return (
    <div className="App">
      <div ref={plotContainer} style={{ width: "100%", height: "100vh" }} />
    </div>
  );
};

export default App;
