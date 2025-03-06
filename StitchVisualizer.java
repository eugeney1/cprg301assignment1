import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseWheelEvent;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractAction;
import javax.swing.ActionMap;
import javax.swing.InputMap;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.KeyStroke;

public class StitchVisualizer extends JPanel {
    private static final int WINDOW_WIDTH = 800;
    private static final int WINDOW_HEIGHT = 600;
    private static final double ZOOM_FACTOR = 1.1;

    private List<Polyline> polylines = new ArrayList<>();
    private double translateX = 0;
    private double translateY = 0;
    private double scale = 1.0;
    private Point lastMousePoint;

    private String[] colors = {
            "white", "black", "gray", "blue", "yellow",
            "red", "orange", "purple", "green", "brown",
            "beige", "pink"
    };

    public StitchVisualizer() {
        loadStitchData("small1.dsb", new int[] { 5, 4, 3, 6, 2, 3, 4, 5, 6, 7, 8, 9, 10 }); // Adjust path and
                                                                                            // colors

        // Mouse wheel for zoom (optional, kept as fallback)
        addMouseWheelListener(new MouseAdapter() {
            @Override
            public void mouseWheelMoved(MouseWheelEvent e) {
                double zoom = e.getWheelRotation() < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
                scale *= zoom;
                repaint();
            }
        });

        // Mouse drag for pan
        addMouseListener(new MouseAdapter() {
            @Override
            public void mousePressed(MouseEvent e) {
                lastMousePoint = e.getPoint();
            }
        });
        addMouseMotionListener(new MouseAdapter() {
            @Override
            public void mouseDragged(MouseEvent e) {
                if (lastMousePoint != null) {
                    translateX += e.getX() - lastMousePoint.x;
                    translateY += e.getY() - lastMousePoint.y;
                    lastMousePoint = e.getPoint();
                    repaint();
                }
            }
        });

        // Keyboard bindings for zoom (Cmd + and Cmd - on Mac, Ctrl + and Ctrl -
        // elsewhere)
        InputMap inputMap = getInputMap(WHEN_IN_FOCUSED_WINDOW);
        ActionMap actionMap = getActionMap();

        // Zoom in: Cmd + or Ctrl +
        inputMap.put(KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, Toolkit.getDefaultToolkit().getMenuShortcutKeyMaskEx()),
                "zoomIn");
        actionMap.put("zoomIn", new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                scale *= ZOOM_FACTOR;
                repaint();
            }
        });

        // Zoom out: Cmd - or Ctrl -
        inputMap.put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, Toolkit.getDefaultToolkit().getMenuShortcutKeyMaskEx()),
                "zoomOut");
        actionMap.put("zoomOut", new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                scale /= ZOOM_FACTOR;
                repaint();
            }
        });
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2d = (Graphics2D) g;
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, getWidth(), getHeight());

        g2d.translate(translateX, translateY);
        g2d.scale(scale, scale);

        for (Polyline polyline : polylines) {
            g2d.setColor(getAWTColor(polyline.color));
            g2d.setStroke(new BasicStroke((float) (1 / scale)));
            for (int i = 0; i < polyline.points.size() - 1; i++) {
                double[] p1 = polyline.points.get(i);
                double[] p2 = polyline.points.get(i + 1);
                g2d.drawLine((int) p1[0], (int) p1[1], (int) p2[0], (int) p2[1]);
            }
        }
    }

    private Color getAWTColor(String colorName) {
        // Map color names to AWT Color objects
        switch (colorName.toLowerCase()) {
            case "white":
                return Color.WHITE;
            case "black":
                return Color.BLACK;
            case "gray":
                return Color.GRAY;
            case "blue":
                return Color.BLUE;
            case "yellow":
                return Color.YELLOW;
            case "red":
                return Color.RED;
            case "orange":
                return Color.ORANGE;
            case "purple":
                return new Color(128, 0, 128); // AWT doesn't have purple, use RGB
            case "green":
                return Color.GREEN;
            case "brown":
                return new Color(165, 42, 42); // RGB for brown
            case "beige":
                return new Color(245, 245, 220); // RGB for beige
            case "pink":
                return Color.PINK;
            default:
                return Color.BLACK; // Fallback
        }
    }

    private void loadStitchData(String filePath, int[] colorOrder) {
        try (FileInputStream fis = new FileInputStream(filePath)) {
            fis.skip(512); // Skip header

            int currentX = 0;
            int currentY = 0;
            int colorIndex = 0;
            String currentColor = colors[colorOrder[colorIndex]];
            List<double[]> currentPolyline = new ArrayList<>();
            currentPolyline.add(new double[] { currentX, currentY });

            byte[] buffer = new byte[3];
            while (fis.read(buffer) == 3) {
                int command = buffer[0] & 0xFF;
                int dy = (buffer[1] & 0xFF);
                int dx = buffer[2] & 0xFF;

                if ((command & 0x20) != 0)
                    dx = -dx; // Negative X
                if ((command & 0x40) != 0)
                    dy = -dy; // Negative Y

                int nextX = currentX + dx;
                int nextY = currentY + dy;

                boolean isColorChange = (command & 0x08) != 0;
                boolean isJump = (command & 0x01) != 0;

                if (isColorChange) {
                    if (currentPolyline.size() > 1) {
                        polylines.add(new Polyline(currentPolyline, currentColor));
                    }
                    colorIndex = (colorIndex + 1) % colorOrder.length;
                    currentColor = colors[colorOrder[colorIndex]];
                    currentPolyline = new ArrayList<>();
                    currentPolyline.add(new double[] { nextX, nextY });
                } else if (isJump) {
                    if (currentPolyline.size() > 1) {
                        polylines.add(new Polyline(currentPolyline, currentColor));
                    }
                    currentPolyline = new ArrayList<>();
                    currentPolyline.add(new double[] { nextX, nextY });
                } else {
                    currentPolyline.add(new double[] { nextX, nextY });
                }

                currentX = nextX;
                currentY = nextY;
            }

            if (currentPolyline.size() > 1) {
                polylines.add(new Polyline(currentPolyline, currentColor));
            }
        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }
    }

    private static class Polyline {
        List<double[]> points;
        String color;

        Polyline(List<double[]> points, String color) {
            this.points = new ArrayList<>(points);
            this.color = color;
        }
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("Stitch Visualizer");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        StitchVisualizer panel = new StitchVisualizer();
        frame.add(panel);
        frame.setVisible(true);
        panel.requestFocusInWindow(); // Ensure panel receives key events
    }
}